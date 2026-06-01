pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        COMMIT_HASH       = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        COMMIT_TIME       = sh(script: 'git log -1 --format=%cI', returnStdout: true).trim()
        PUPPET_MASTER_IP  = '192.168.56.2'
        STAGING_IP        = '192.168.56.5'
        PROD_IP           = '192.168.56.4'
        NEXUS_URL_RELEASE = 'http://192.168.56.3:8081/repository/tire-testing-releases'
        NEXUS_URL_SNAP    = 'http://192.168.56.3:8081/repository/tire-testing-snapshots'
    }

    stages {

        // ── Guard: abort immediately if not dev or main ───────────────────
        stage('Branch Check') {
            steps {
                script {
                    env.GIT_BRANCH_NAME = sh(
                            script: 'git rev-parse --abbrev-ref HEAD',
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

        // ── Stage 0: Record start time + resolve version ──────────────────
        stage('Track Start') {
            steps {
                script {
                    env.PIPELINE_START = sh(script: 'date -Iseconds', returnStdout: true).trim()

                    def rawVersion = sh(
                            script: 'cd backend && mvn help:evaluate -Dexpression=project.version -q -DforceStdout -B',
                            returnStdout: true
                    ).trim()

                    if (env.GIT_BRANCH_NAME == 'main') {
                        env.APP_VERSION = rawVersion.replace('-SNAPSHOT', '')
                        env.BUILD_TYPE  = 'RELEASE'
                        env.NEXUS_REPO  = env.NEXUS_URL_RELEASE
                    } else {
                        env.APP_VERSION = rawVersion
                        env.BUILD_TYPE  = 'SNAPSHOT'
                        env.NEXUS_REPO  = env.NEXUS_URL_SNAP
                    }

                    echo """
                    ╔══════════════════════════════════════════════════════╗
                    ║  PIPELINE 1 — TRADITIONAL                           ║
                    ║  Branch:  ${env.GIT_BRANCH_NAME}                   ║
                    ║  Type:    ${env.BUILD_TYPE}                         ║
                    ║  Version: ${env.APP_VERSION}                        ║
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
                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        script {
                            if (env.GIT_BRANCH_NAME == 'main') {
                                // Strip -SNAPSHOT from pom.xml before building
                                sh "mvn versions:set -DnewVersion=${env.APP_VERSION} -DgenerateBackupPoms=false -B"
                            }
                        }
                        sh 'mvn clean package -DskipTests -B'
                    }
                }
                script {
                    env.BUILD_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Build complete — ${env.BUILD_TYPE} ${env.APP_VERSION}"
                    sh "ls -lh backend/target/tire-testing-${env.APP_VERSION}.jar"
                }
            }
        }

        // ── Stage 2: Test ─────────────────────────────────────────────────
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

        // ── Stage 3: Upload to Nexus ──────────────────────────────────────
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

                script {
                    // For snapshots: check maven-metadata.xml (timestamp JAR names vary)
                    // For releases:  check the JAR directly
                    def checkUrl = (env.GIT_BRANCH_NAME == 'main')
                            ? "${env.NEXUS_REPO}/com/myproject/tire-testing/${env.APP_VERSION}/tire-testing-${env.APP_VERSION}.jar"
                            : "${env.NEXUS_REPO}/com/myproject/tire-testing/${env.APP_VERSION}/maven-metadata.xml"

                    def status = sh(
                            script: """
                            curl -s -o /dev/null -w "%{http_code}" \
                              -u jenkins:jenkins_nexus123 \
                              "${checkUrl}"
                        """,
                            returnStdout: true
                    ).trim()

                    echo "Nexus verification (${env.BUILD_TYPE}): HTTP ${status}"

                    if (status != '200') {
                        error("Artifact not found in Nexus after deploy (HTTP ${status}). Check credentials and repo config.")
                    }

                    echo "Artifact verified in Nexus — ${env.NEXUS_REPO}"
                }
            }
        }

        // ── Stage 4: Deploy to Staging (dev → snapshot, main → release) ──
        stage('Deploy to Staging') {
            steps {
                script {
                    env.DEPLOY_START = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Deploying ${env.BUILD_TYPE} ${env.APP_VERSION} to Staging (VM4)..."
                }

                withCredentials([sshUserPrivateKey(credentialsId: 'vm-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                    sh """
                      echo "--- Updating Hiera for VM4 (staging) ---"
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          root@${PUPPET_MASTER_IP} \
                          "printf '%s\n' '---' 'app_version: \\'${env.APP_VERSION}\\'' \
                          > /etc/puppetlabs/code/environments/production/hieradata/nodes/vm4.yaml \
                          && echo 'Hiera updated:' \
                          && cat /etc/puppetlabs/code/environments/production/hieradata/nodes/vm4.yaml"

                      echo "--- Triggering Puppet on VM4 (staging) ---"
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          root@${STAGING_IP} \
                          "timeout 120 /opt/puppetlabs/bin/puppet agent --test --no-daemonize \
                          && echo 'Puppet run complete on staging' \
                          || echo 'Puppet agent finished (non-zero exit is normal if no changes)'"
                    """
                }
            }
        }

        // ── Stage 5: Health Check — Staging ───────────────────────────────
        stage('Health Check — Staging') {
            steps {
                sh """
                  echo "Waiting for staging to become healthy at ${STAGING_IP}:8080..."
                  MAX=36
                  for i in \$(seq 1 \$MAX); do
                    CODE=\$(curl -s -o /dev/null --write-out "%{http_code}" \
                      --max-time 5 http://${STAGING_IP}:8080/actuator/health 2>/dev/null || echo "000")
                    echo "  Attempt \$i/\$MAX → HTTP \$CODE"
                    if [ "\$CODE" = "200" ]; then
                      echo "Staging is healthy!"
                      exit 0
                    fi
                    sleep 10
                  done
                  echo "Staging health check FAILED after \$(( MAX * 10 ))s"
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
                withCredentials([sshUserPrivateKey(credentialsId: 'vm-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                    sh """
                      echo "--- Staging passed. Promoting release ${env.APP_VERSION} to Production (VM3) ---"

                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          root@${PUPPET_MASTER_IP} \
                          "printf '%s\n' '---' 'app_version: \\'${env.APP_VERSION}\\'' \
                          > /etc/puppetlabs/code/environments/production/hieradata/nodes/vm3.yaml \
                          && echo 'Hiera updated:' \
                          && cat /etc/puppetlabs/code/environments/production/hieradata/nodes/vm3.yaml"

                      echo "--- Triggering Puppet on VM3 (production) ---"
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          root@${PROD_IP} \
                          "timeout 120 /opt/puppetlabs/bin/puppet agent --test --no-daemonize \
                          && echo 'Puppet run complete on production' \
                          || echo 'Puppet agent finished (non-zero exit is normal if no changes)'"
                    """
                }

                script {
                    env.DEPLOY_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
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
                  echo "Waiting for production to become healthy at ${PROD_IP}:8080..."
                  MAX=36
                  for i in \$(seq 1 \$MAX); do
                    CODE=\$(curl -s -o /dev/null --write-out "%{http_code}" \
                      --max-time 5 http://${PROD_IP}:8080/actuator/health 2>/dev/null || echo "000")
                    echo "  Attempt \$i/\$MAX → HTTP \$CODE"
                    if [ "\$CODE" = "200" ]; then
                      echo "Production is healthy!"
                      exit 0
                    fi
                    sleep 10
                  done
                  echo "Production health check FAILED after \$(( MAX * 10 ))s"
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

                  DEPLOY_END_VAL="${env.DEPLOY_END ?: env.DEPLOY_START}"

                  echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},${env.BUILD_END},${env.DEPLOY_START},\$DEPLOY_END_VAL,${env.APP_VERSION},${env.BUILD_TYPE},SUCCESS,traditional" \
                    >> /var/log/dora/metrics.csv

                  echo "DORA row logged:"
                  tail -1 /var/log/dora/metrics.csv
                """
            }
        }

    }

    post {
        failure {
            sh """
              mkdir -p /var/log/dora
              echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},${env.BUILD_END ?: ''},${env.DEPLOY_START ?: ''},\$(date -Iseconds),${env.APP_VERSION ?: ''},${env.BUILD_TYPE ?: 'UNKNOWN'},FAILED,traditional" \
                >> /var/log/dora/metrics.csv
              echo "FAILED row logged to DORA"
            """
        }

        success {
            echo "Pipeline 1 complete — ${env.BUILD_TYPE} ${env.APP_VERSION} deployed successfully."
        }

        always {
            archiveArtifacts(
                    artifacts: 'backend/target/surefire-reports/**',
                    allowEmptyArchive: true
            )
        }
    }
}