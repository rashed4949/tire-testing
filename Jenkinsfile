pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        COMMIT_HASH      = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        COMMIT_TIME      = sh(script: 'git log -1 --format=%cI', returnStdout: true).trim()
        PUPPET_MASTER_IP = '192.168.56.2'
        PROD_IP          = '192.168.56.4'
        STAGING_IP       = '192.168.56.5'
        NEXUS_URL        = 'http://192.168.56.3:8081/repository/tire-testing-releases'
        NEXUS_URL_SNAP   = 'http://192.168.56.3:8081/repository/tire-testing-snapshots'
    }

    stages {

        // ── Guard: only run on dev or main ────────────────────────────────
        stage('Branch Check') {
            steps {
                script {
                    // git rev-parse fails in detached HEAD (Jenkins checkout by commit hash)
                    // Use GIT_BRANCH env var Jenkins sets, or fall back to origin ref
                    env.GIT_BRANCH_NAME = sh(
                            script: '''
                    git name-rev --name-only HEAD \
                    | sed 's|remotes/origin/||' \
                    | sed 's|~.*||'
                ''',
                            returnStdout: true
                    ).trim()

                    echo "Triggered on branch: ${env.GIT_BRANCH_NAME}"

                    if (env.GIT_BRANCH_NAME != 'main' && env.GIT_BRANCH_NAME != 'dev') {
                        currentBuild.result = 'NOT_BUILT'
                        error("Branch '${env.GIT_BRANCH_NAME}' is not dev or main — skipping pipeline.")
                    }
                }
            }
        }

        // ── Stage 0: Record pipeline start time ───────────────────────────
        stage('Track Start') {
            steps {
                script {
                    env.PIPELINE_START = sh(
                            script: 'date -Iseconds',
                            returnStdout: true
                    ).trim()

                    // Set build type and version based on branch
                    if (env.GIT_BRANCH_NAME == 'main') {
                        env.BUILD_TYPE   = 'RELEASE'
                        env.NEXUS_ACTIVE = env.NEXUS_URL
                    } else {
                        env.BUILD_TYPE   = 'SNAPSHOT'
                        env.NEXUS_ACTIVE = env.NEXUS_URL_SNAP
                    }

                    echo """
                    ╔══════════════════════════════════════════════════════╗
                    ║  PIPELINE 1 — TRADITIONAL                           ║
                    ║  Branch:  ${env.GIT_BRANCH_NAME}                   ║
                    ║  Type:    ${env.BUILD_TYPE}                         ║
                    ║  Commit:  ${COMMIT_HASH}                            ║
                    ║  Started: ${env.PIPELINE_START}                     ║
                    ╚══════════════════════════════════════════════════════╝
                    """
                }
            }
        }

        // ── Stage 1: Build JAR + React ────────────────────────────────────
        stage('Build — JAR + React') {
            steps {
                dir('backend') {
                    sh "mvn versions:set -DnewVersion=0.0.${BUILD_NUMBER} -DgenerateBackupPoms=false -B"

                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        sh 'mvn clean package -DskipTests -B'
                    }
                }

                script {
                    env.BUILD_END = sh(script: 'date -Iseconds', returnStdout: true).trim()

                    dir('backend') {
                        env.APP_VERSION = sh(
                                script: 'mvn help:evaluate -Dexpression=project.version -q -DforceStdout -B',
                                returnStdout: true
                        ).trim()
                    }

                    echo "Build complete. Version: ${env.APP_VERSION}"
                    echo "Build finished at: ${env.BUILD_END}"
                    sh "ls -lh backend/target/tire-testing-${env.APP_VERSION}.jar"
                }
            }
        }

        // ── Stage 2: Run Tests ────────────────────────────────────────────
        stage('Test') {
            steps {
                dir('backend') {
                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        sh 'mvn test -B'
                    }
                }
            }
            post {
                always {
                    junit(
                            allowEmptyResults: true,
                            testResults: 'backend/target/surefire-reports/*.xml'
                    )
                }
            }
        }

        // ── Stage 3: Upload JAR to Nexus ──────────────────────────────────
        stage('Upload to Nexus') {
            steps {
                dir('backend') {
                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        sh 'mvn deploy -DskipTests -B'
                    }
                }

                sh """
                  HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" \
                    -u jenkins:Raizanhasan4949 \
                    "${env.NEXUS_ACTIVE}/com/myproject/tire-testing/${env.APP_VERSION}/tire-testing-${env.APP_VERSION}.jar")
                  echo "Nexus verification (${env.BUILD_TYPE}): HTTP \$HTTP_CODE"
                  if [ "\$HTTP_CODE" != "200" ]; then
                    echo "JAR not found in Nexus! Upload may have failed."
                    exit 1
                  fi
                  echo "JAR verified in Nexus repository."
                """
            }
        }

        // ── Stage 4: Deploy to Staging (dev + main) ───────────────────────
        stage('Deploy to Staging') {
            steps {
                script {
                    env.DEPLOY_START = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Starting staging deployment at: ${env.DEPLOY_START}"
                }

                withCredentials([
                        sshUserPrivateKey(
                                credentialsId: 'vm-ssh-key',
                                keyFileVariable: 'SSH_KEY'
                        )
                ]) {
                    sh """
                      echo "Updating Hiera version for staging (VM4) to ${env.APP_VERSION}..."
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          node1@${PUPPET_MASTER_IP} \
                          "sudo sh -c 'printf -- \\\"---\\\\napp_version: ${env.APP_VERSION}\\\\n\\\" > /etc/puppet/code/environments/production/hieradata/nodes/vm4.yaml && cat /etc/puppet/code/environments/production/hieradata/nodes/vm4.yaml && echo Hiera updated for staging'"

                      echo "Triggering Puppet agent on VM4 (staging)..."
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          node4@${STAGING_IP} \
                          "sudo /opt/puppetlabs/bin/puppet agent --test --no-daemonize; echo Puppet run complete on staging"
                    """
                }
            }
        }

        // ── Stage 5: Health Check — Staging ───────────────────────────────
        stage('Health Check — Staging') {
            steps {
                sh """
                  echo "Verifying staging health after deployment..."
                  MAX_ATTEMPTS=3
                  SLEEP_SECS=5

                  for i in \$(seq 1 \$MAX_ATTEMPTS); do
                    HTTP_CODE=\$(curl -s \
                      --max-time 5 \
                      --output /dev/null \
                      --write-out "%{http_code}" \
                      http://${STAGING_IP}:8081/actuator/health \
                      2>/dev/null || echo "000")

                    echo "  Attempt \$i/\$MAX_ATTEMPTS → HTTP \$HTTP_CODE"

                    if [ "\$HTTP_CODE" = "200" ]; then
                      echo "Staging is healthy!"
                      exit 0
                    fi

                    if [ \$i -lt \$MAX_ATTEMPTS ]; then
                      sleep \$SLEEP_SECS
                    fi
                  done

                  echo "FAILED: Staging did not become healthy within \$(( MAX_ATTEMPTS * SLEEP_SECS ))s"
                  curl -v http://${STAGING_IP}:8081/actuator/health 2>&1 || true
                  exit 1
                """
            }
        }

        // ── Stage 6: Deploy to Production (main only) ─────────────────────
        stage('Deploy to Production') {
            when {
                expression { env.GIT_BRANCH_NAME == 'main' }
            }
            steps {
                withCredentials([
                        sshUserPrivateKey(
                                credentialsId: 'vm-ssh-key',
                                keyFileVariable: 'SSH_KEY'
                        )
                ]) {
                    sh """
                      echo "Staging passed. Promoting release ${env.APP_VERSION} to Production (VM3)..."

                      echo "Updating Hiera version for production (VM3) to ${env.APP_VERSION}..."
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          node1@${PUPPET_MASTER_IP} \
                          "sudo sh -c 'printf -- \\\"---\\\\napp_version: ${env.APP_VERSION}\\\\n\\\" > /etc/puppet/code/environments/production/hieradata/nodes/vm3.yaml && cat /etc/puppet/code/environments/production/hieradata/nodes/vm3.yaml && echo Hiera updated for production'"

                      echo "Triggering Puppet agent on VM3 (production)..."
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          node3@${PROD_IP} \
                          "sudo /opt/puppetlabs/bin/puppet agent --test --no-daemonize; echo Puppet run complete on production"
                    """
                }

                script {
                    env.DEPLOY_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Production deploy complete at: ${env.DEPLOY_END}"
                }
            }
        }

        // ── Stage 7: Health Check — Production (main only) ────────────────
        stage('Health Check — Production') {
            when {
                expression { env.GIT_BRANCH_NAME == 'main' }
            }
            steps {
                sh """
                  echo "Verifying production health after deployment..."
                  MAX_ATTEMPTS=3
                  SLEEP_SECS=5

                  for i in \$(seq 1 \$MAX_ATTEMPTS); do
                    HTTP_CODE=\$(curl -s \
                      --max-time 5 \
                      --output /dev/null \
                      --write-out "%{http_code}" \
                      http://${PROD_IP}:8081/actuator/health \
                      2>/dev/null || echo "000")

                    echo "  Attempt \$i/\$MAX_ATTEMPTS → HTTP \$HTTP_CODE"

                    if [ "\$HTTP_CODE" = "200" ]; then
                      echo "Application is healthy!"
                      REACT_CODE=\$(curl -s \
                        --max-time 5 \
                        --output /dev/null \
                        --write-out "%{http_code}" \
                        http://${PROD_IP}:8080/ \
                        2>/dev/null || echo "000")
                      echo "  React app HTTP: \$REACT_CODE"
                      exit 0
                    fi

                    if [ \$i -lt \$MAX_ATTEMPTS ]; then
                      sleep \$SLEEP_SECS
                    fi
                  done

                  echo "FAILED: Application did not become healthy within \$(( MAX_ATTEMPTS * SLEEP_SECS ))s"
                  curl -v http://${PROD_IP}:8081/actuator/health 2>&1 || true
                  exit 1
                """
            }
        }

        // ── Stage 8: Log DORA Metrics ──────────────────────────────────────
        stage('Log DORA Metrics') {
            steps {
                sh """
                  mkdir -p /var/log/dora
                  chmod 777 /var/log/dora

                  echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},\
${env.BUILD_END},${env.DEPLOY_START},${env.DEPLOY_END},SUCCESS,traditional" \
                    >> /var/log/dora/metrics.csv

                  echo "DORA row logged successfully:"
                  echo "  commit_hash:    ${COMMIT_HASH}"
                  echo "  commit_time:    ${COMMIT_TIME}"
                  echo "  pipeline_start: ${env.PIPELINE_START}"
                  echo "  build_end:      ${env.BUILD_END}"
                  echo "  deploy_start:   ${env.DEPLOY_START}"
                  echo "  deploy_end:     ${env.DEPLOY_END}"
                  echo "  status:         SUCCESS"
                  echo "  pipeline:       traditional"

                  echo "--- Full DORA log ---"
                  cat /var/log/dora/metrics.csv
                """
            }
        }

    }

    post {
        failure {
            sh """
              mkdir -p /var/log/dora
              echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},\
${env.BUILD_END ?: ''},${env.DEPLOY_START ?: ''},\$(date -Iseconds),FAILED,traditional" \
                >> /var/log/dora/metrics.csv
              echo "FAILED deployment recorded in DORA log"
            """
        }

        success {
            echo "Pipeline 1 (Traditional) — Deployment successful. Version: ${env.APP_VERSION}"
        }

        always {
            archiveArtifacts(
                    artifacts: 'backend/target/surefire-reports/**',
                    allowEmptyArchive: true
            )
        }
    }
}