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
        STAGING_IP        = '192.168.56.5'   // VM4
        PROD_IP           = '192.168.56.4'   // VM3
        NEXUS_URL_RELEASE = 'http://192.168.56.3:8081/repository/tire-testing-releases'
        NEXUS_URL_SNAP    = 'http://192.168.56.3:8081/repository/tire-testing-snapshots'
        IS_MAIN           = "${env.BRANCH_NAME == 'main' ? 'true' : 'false'}"
    }

    stages {

        stage('Track Start') {
            steps {
                script {
                    env.PIPELINE_START = sh(script: 'date -Iseconds', returnStdout: true).trim()

                    // Set version based on branch
                    if (env.BRANCH_NAME == 'main') {
                        // Strip -SNAPSHOT for release build
                        def rawVersion = sh(
                                script: 'cd backend && mvn help:evaluate -Dexpression=project.version -q -DforceStdout -B',
                                returnStdout: true
                        ).trim()
                        env.APP_VERSION = rawVersion.replace('-SNAPSHOT', '')
                        env.BUILD_TYPE = 'RELEASE'
                    } else {
                        env.APP_VERSION = sh(
                                script: 'cd backend && mvn help:evaluate -Dexpression=project.version -q -DforceStdout -B',
                                returnStdout: true
                        ).trim()
                        env.BUILD_TYPE = 'SNAPSHOT'
                    }

                    echo "Branch: ${env.BRANCH_NAME} | Type: ${env.BUILD_TYPE} | Version: ${env.APP_VERSION}"
                }
            }
        }

        stage('Build — JAR + React') {
            steps {
                dir('backend') {
                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        script {
                            if (env.BRANCH_NAME == 'main') {
                                // Set release version before building (removes -SNAPSHOT)
                                sh "mvn versions:set -DnewVersion=${env.APP_VERSION} -B"
                            }
                        }
                        sh 'mvn clean package -DskipTests -B'
                    }
                }
                script {
                    env.BUILD_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Build complete. Version: ${env.APP_VERSION} (${env.BUILD_TYPE})"
                }
            }
        }

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
                    junit(allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml')
                }
            }
        }

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
                    // Verify it's in the correct Nexus repo
                    def nexusUrl = (env.BRANCH_NAME == 'main') ? env.NEXUS_URL_RELEASE : env.NEXUS_URL_SNAP
                    sh """
                      HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" \
                        -u jenkins:jenkins_nexus123 \
                        "${nexusUrl}/com/myproject/tire-testing/${env.APP_VERSION}/tire-testing-${env.APP_VERSION}.jar")
                      echo "Nexus verification (${env.BUILD_TYPE}): HTTP \$HTTP_CODE"
                      if [ "\$HTTP_CODE" != "200" ]; then
                        echo "JAR not found in Nexus!"
                        exit 1
                      fi
                    """
                }
            }
        }

        // ── Always deploy to Staging ──────────────────────────────────────
        stage('Deploy to Staging') {
            steps {
                script { env.DEPLOY_START = sh(script: 'date -Iseconds', returnStdout: true).trim() }

                withCredentials([sshUserPrivateKey(credentialsId: 'vm-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                    sh """
                      echo "Updating Hiera for VM4 (staging) → ${env.APP_VERSION}..."
                      ssh -i \$SSH_KEY -o StrictHostKeyChecking=no root@${PUPPET_MASTER_IP} \
                        "echo '---\napp_version: \\'${env.APP_VERSION}\\'' \
                        > /etc/puppetlabs/code/environments/production/hieradata/nodes/vm4.yaml"

                      echo "Triggering Puppet on VM4 (staging)..."
                      ssh -i \$SSH_KEY -o StrictHostKeyChecking=no root@${STAGING_IP} \
                        "timeout 120 /opt/puppetlabs/bin/puppet agent --test --no-daemonize"
                    """
                }
            }
        }

        stage('Health Check — Staging') {
            steps {
                sh """
                  echo "Checking staging health at ${STAGING_IP}:8080..."
                  for i in \$(seq 1 36); do
                    HTTP_CODE=\$(curl -s -o /dev/null --write-out "%{http_code}" \
                      --max-time 5 http://${STAGING_IP}:8080/actuator/health 2>/dev/null || echo "000")
                    echo "  Attempt \$i/36 → HTTP \$HTTP_CODE"
                    if [ "\$HTTP_CODE" = "200" ]; then
                      echo "Staging is healthy!"
                      exit 0
                    fi
                    sleep 10
                  done
                  echo "Staging health check FAILED"
                  exit 1
                """
            }
        }

        // ── Only deploy to Production on main branch ──────────────────────
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'vm-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                    sh """
                      echo "Staging healthy. Promoting release ${env.APP_VERSION} to production..."

                      echo "Updating Hiera for VM3 (prod) → ${env.APP_VERSION}..."
                      ssh -i \$SSH_KEY -o StrictHostKeyChecking=no root@${PUPPET_MASTER_IP} \
                        "echo '---\napp_version: \\'${env.APP_VERSION}\\'' \
                        > /etc/puppetlabs/code/environments/production/hieradata/nodes/vm3.yaml"

                      echo "Triggering Puppet on VM3 (prod)..."
                      ssh -i \$SSH_KEY -o StrictHostKeyChecking=no root@${PROD_IP} \
                        "timeout 120 /opt/puppetlabs/bin/puppet agent --test --no-daemonize"
                    """
                }

                script {
                    env.DEPLOY_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                }
            }
        }

        stage('Health Check — Production') {
            when {
                branch 'main'
            }
            steps {
                sh """
                  echo "Checking production health at ${PROD_IP}:8080..."
                  for i in \$(seq 1 36); do
                    HTTP_CODE=\$(curl -s -o /dev/null --write-out "%{http_code}" \
                      --max-time 5 http://${PROD_IP}:8080/actuator/health 2>/dev/null || echo "000")
                    echo "  Attempt \$i/36 → HTTP \$HTTP_CODE"
                    if [ "\$HTTP_CODE" = "200" ]; then
                      echo "Production is healthy!"
                      exit 0
                    fi
                    sleep 10
                  done
                  echo "Production health check FAILED"
                  exit 1
                """
            }
        }

        stage('Log DORA Metrics') {
            steps {
                sh """
                  mkdir -p /var/log/dora
                  echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},${env.BUILD_END},${env.DEPLOY_START},${env.DEPLOY_END ?: env.DEPLOY_START},${env.BUILD_TYPE},SUCCESS,traditional" \
                    >> /var/log/dora/metrics.csv
                """
            }
        }
    }

    post {
        failure {
            sh """
              mkdir -p /var/log/dora
              echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},${env.BUILD_END ?: ''},${env.DEPLOY_START ?: ''},\$(date -Iseconds),${env.BUILD_TYPE ?: 'UNKNOWN'},FAILED,traditional" \
                >> /var/log/dora/metrics.csv
            """
        }
    }
}