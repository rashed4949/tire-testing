pipeline {
    agent any

    // Use the managed Maven settings.xml that contains Nexus credentials
    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        // DORA tracking fields
        COMMIT_HASH  = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        COMMIT_TIME  = sh(script: 'git log -1 --format=%cI', returnStdout: true).trim()

        // Infrastructure IPs
        PUPPET_MASTER_IP = '192.168.56.2'
        PROD_IP          = '192.168.56.4'

        // Nexus
        NEXUS_URL    = 'http://192.168.56.3:8081/repository/tire-testing-releases'
    }

    stages {

        // ── Stage 0: Record pipeline start time ───────────────────────────
        stage('Track Start') {
            steps {
                script {
                    env.PIPELINE_START = sh(
                            script: 'date -Iseconds',
                            returnStdout: true
                    ).trim()

                    echo """
                    ╔══════════════════════════════════════════════════════╗
                    ║  PIPELINE 1 — TRADITIONAL                           ║
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

                // Push updated pom.xml back to git
                withCredentials([usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh """
                git config user.email "rrashed4@gmail.com"
                git config user.name "rashed4949"
                git add backend/pom.xml
                git commit -m "ci: bump version to 0.0.${BUILD_NUMBER} [skip ci]"
                git push https://\${GIT_USER}:\${GIT_TOKEN}@github.com/rashed4949/tire-testing.git HEAD:main
            """
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
                    sh "ls -lh backend/target/tire-testing-${env.APP_VERSION}.jar"
                }
            }
        }

        // ── Stage 2: Run Tests ────────────────────────────────────────────
        stage('Test') {
            steps {
                dir('backend') {
                    // Tests use H2 in-memory database (scope=test in pom.xml)
                    // No PostgreSQL connection needed here
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
                    // mvn deploy uses the distributionManagement in pom.xml
                    // Authentication comes from the Maven settings.xml (global-maven-settings)
                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        sh 'mvn deploy -DskipTests -B'
                    }
                }

                // Verify it's in Nexus
                sh """
                  HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" \
                    -u jenkins:Raizanhasan4949 \
                    "${NEXUS_URL}/com/myproject/tire-testing/${env.APP_VERSION}/tire-testing-${env.APP_VERSION}.jar")
                  echo "Nexus verification: HTTP \$HTTP_CODE"
                  if [ "\$HTTP_CODE" != "200" ]; then
                    echo "JAR not found in Nexus! Upload may have failed."
                    exit 1
                  fi
                  echo "JAR verified in Nexus repository."
                """
            }
        }

        // ── Stage 4: Deploy via Puppet ─────────────────────────────────────
        stage('Deploy via Puppet') {
            steps {
                script {
                    env.DEPLOY_START = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Starting deployment at: ${env.DEPLOY_START}"
                }

                withCredentials([
                        sshUserPrivateKey(
                                credentialsId: 'vm-ssh-key',
                                keyFileVariable: 'SSH_KEY'
                        )
                ]) {
                    sh """
                          # ── Step 1: Update the version in Puppet Hiera ────────
                          echo "Updating Hiera version to ${env.APP_VERSION}..."
                          ssh -i \$SSH_KEY \
                              -o StrictHostKeyChecking=no \
                              -o ConnectTimeout=10 \
                              node1@${PUPPET_MASTER_IP} \
                              "sudo sh -c 'printf -- \\\"---\\\\napp_version: ${env.APP_VERSION}\\\\n\\\" > /etc/puppet/code/environments/production/hieradata/common.yaml && cat /etc/puppet/code/environments/production/hieradata/common.yaml && echo Hiera updated on Puppet Master'"
                        
                          # ── Step 2: Trigger immediate Puppet run on VM3 ───────
                          echo "Triggering Puppet agent run on VM3..."
                          ssh -i \$SSH_KEY \
                              -o StrictHostKeyChecking=no \
                              -o ConnectTimeout=10 \
                              node3@${PROD_IP} \
                              "sudo /opt/puppetlabs/bin/puppet agent --test --no-daemonize; echo Puppet run complete"
                        """
                }

                script {
                    env.DEPLOY_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Puppet deploy complete at: ${env.DEPLOY_END}"
                }
            }
        }

        // ── Stage 5: Health Check ──────────────────────────────────────────
        stage('Health Check') {
            steps {
                sh """
                  echo "Verifying application health after deployment..."
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

                      # Also verify React app is served correctly
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
                  # Show the actual response for debugging
                  curl -v http://${PROD_IP}:8081/actuator/health 2>&1 || true
                  exit 1
                """
            }
        }

        // ── Stage 6: Log DORA Metrics ──────────────────────────────────────
        stage('Log DORA Metrics') {
            steps {
                sh """
                  mkdir -p /var/log/dora
                  chmod 777 /var/log/dora

                  # Write DORA CSV row
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

                  # Show all logged rows
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
            // Archive test results
            archiveArtifacts(
                    artifacts: 'backend/target/surefire-reports/**',
                    allowEmptyArchive: true
            )
        }
    }
}
