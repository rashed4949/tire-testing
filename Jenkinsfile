pipeline {
    agent any
    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }
    parameters {
        choice(
                name: 'BUILD_MODE',
                choices: ['SNAPSHOT', 'RELEASE'],
                description: 'SNAPSHOT = build + deploy to staging. RELEASE = build + deploy to production.'
        )
    }
    environment {
        COMMIT_HASH      = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        COMMIT_TIME      = sh(script: 'git log -1 --format=%cI', returnStdout: true).trim()
        PUPPET_MASTER_IP = '192.168.56.2'
        PROD_IP          = '192.168.56.4'
        STAGING_IP       = '192.168.56.5'
        NEXUS_RELEASES   = 'http://192.168.56.3:8081/repository/tire-testing-releases'
        NEXUS_SNAPSHOTS  = 'http://192.168.56.3:8081/repository/tire-testing-snapshots'
    }

    stages {
        stage('Branch Check') {
            steps {
                script {
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
        stage('Track Start') {
            steps {
                script {
                    env.PIPELINE_START = sh(script: 'date -Iseconds', returnStdout: true).trim()

                    def dateVersion = sh(
                            script: 'date +%Y.%m.%d',
                            returnStdout: true
                    ).trim()
                    def isRelease
                    if (env.GIT_BRANCH_NAME == 'main') {
                        isRelease = true
                    } else if (env.GIT_BRANCH_NAME == 'dev') {
                        isRelease = false
                    } else {
                        isRelease = (params.BUILD_MODE == 'RELEASE')
                    }
                    if (isRelease) {
                        env.BUILD_TYPE    = 'RELEASE'
                        env.APP_VERSION   = "${dateVersion}-${env.BUILD_NUMBER}"
                        env.DEPLOY_TARGET = env.PROD_IP
                        env.HIERA_NODE    = 'vm3'
                        env.SSH_USER      = 'node3'
                    } else {
                        env.BUILD_TYPE    = 'SNAPSHOT'
                        env.APP_VERSION   = "${dateVersion}-${env.BUILD_NUMBER}-SNAPSHOT"
                        env.DEPLOY_TARGET = env.STAGING_IP
                        env.HIERA_NODE    = 'vm4'
                        env.SSH_USER      = 'node3'
                    }
                    echo """
              PIPELINE 1 — TRADITIONAL                           
              Branch:  ${env.GIT_BRANCH_NAME}                   
              Mode:    ${params.BUILD_MODE}                      
              Type:    ${env.BUILD_TYPE}                         
              Version: ${env.APP_VERSION}                        
              Target:  ${env.DEPLOY_TARGET}                      
              Commit:  ${COMMIT_HASH}                            
              Started: ${env.PIPELINE_START}                     
            """
                }
            }
        }
        stage('Build — JAR + React') {
            steps {
                dir('backend') {
                    sh "mvn versions:set -DnewVersion=${env.APP_VERSION} -DgenerateBackupPoms=false -B"
                    withMaven(
                            globalMavenSettingsConfig: 'global-maven-settings',
                            mavenLocalRepo: '/var/lib/jenkins/.m2/repository'
                    ) {
                        sh 'mvn clean package -DskipTests -B'
                    }
                }
                script {
                    env.BUILD_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Build complete. Version: ${env.APP_VERSION}"
                    echo "Build finished at: ${env.BUILD_END}"
                    sh "ls -lh backend/target/tire-testing-${env.APP_VERSION}.jar"
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
                    junit(
                            allowEmptyResults: true,
                            testResults: 'backend/target/surefire-reports/*.xml'
                    )
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
                    def nexusBase = (env.BUILD_TYPE == 'RELEASE')
                            ? 'http://192.168.56.3:8081/repository/tire-testing-releases'
                            : 'http://192.168.56.3:8081/repository/tire-testing-snapshots'

                    def checkUrl = (env.BUILD_TYPE == 'RELEASE')
                            ? "${nexusBase}/com/myproject/tire-testing/${env.APP_VERSION}/tire-testing-${env.APP_VERSION}.jar"
                            : "${nexusBase}/com/myproject/tire-testing/${env.APP_VERSION}/maven-metadata.xml"
                    def status = sh(
                            script: """
                            curl -s -o /dev/null -w "%{http_code}" \
                              -u jenkins:Raizanhasan4949 \
                              "${checkUrl}"
                        """,
                            returnStdout: true
                    ).trim()
                    echo "Nexus verification (${env.BUILD_TYPE}): HTTP ${status}"
                    echo "Checked URL: ${checkUrl}"
                    if (status != '200') {
                        error("Artifact not found in Nexus (HTTP ${status}). URL: ${checkUrl}")
                    }
                    echo "Artifact verified in Nexus."
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    env.DEPLOY_START = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Deploying ${env.BUILD_TYPE} ${env.APP_VERSION} to ${env.DEPLOY_TARGET}..."
                }
                withCredentials([
                        sshUserPrivateKey(
                                credentialsId: 'vm-ssh-key',
                                keyFileVariable: 'SSH_KEY'
                        )
                ]) {
                    sh """
                      echo "--- Updating Hiera for ${env.HIERA_NODE} → ${env.APP_VERSION} ---"
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          node1@${PUPPET_MASTER_IP} \
                          "sudo sh -c 'printf -- \\\"---\\\\napp_version: ${env.APP_VERSION}\\\\n\\\" \
                          > /etc/puppetlabs/code/environments/production/hieradata/nodes/${env.HIERA_NODE}.yaml \
                          && cat /etc/puppetlabs/code/environments/production/hieradata/nodes/${env.HIERA_NODE}.yaml \
                          && echo Hiera updated'"

                      echo "--- Triggering Puppet on ${env.DEPLOY_TARGET} ---"
                      ssh -i \$SSH_KEY \
                          -o StrictHostKeyChecking=no \
                          -o ConnectTimeout=10 \
                          ${env.SSH_USER}@${env.DEPLOY_TARGET} \
                          "sudo /opt/puppetlabs/bin/puppet agent --test --no-daemonize; echo Puppet run complete"
                    """
                }
                script {
                    env.DEPLOY_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    echo "Deploy complete at: ${env.DEPLOY_END}"
                }
            }
        }
        stage('Health Check') {
            steps {
                sh """
          echo "Waiting for app to initialize..."
          sleep 20

          echo "Verifying health at ${env.DEPLOY_TARGET}:8081..."
          MAX_ATTEMPTS=3
          SLEEP_SECS=5

          for i in \$(seq 1 \$MAX_ATTEMPTS); do
            HTTP_CODE=\$(curl -s --max-time 5 --output /dev/null --write-out "%{http_code}" \
              http://${env.DEPLOY_TARGET}:8081/actuator/health 2>/dev/null)
            if [ -z "\$HTTP_CODE" ]; then
              HTTP_CODE="000"
            fi
            echo "  Attempt \$i/\$MAX_ATTEMPTS → HTTP \$HTTP_CODE"
            if [ "\$HTTP_CODE" = "200" ]; then
              echo "Application is healthy on ${env.DEPLOY_TARGET}!"
              exit 0
            fi
            if [ \$i -lt \$MAX_ATTEMPTS ]; then
              sleep \$SLEEP_SECS
            fi
          done
          echo "FAILED: Application did not become healthy within \$(( MAX_ATTEMPTS * SLEEP_SECS + 20 ))s"
          exit 1
        """
            }
        }
        stage('Log DORA Metrics') {
            steps {
                sh """
                  mkdir -p /var/log/dora
                  chmod 777 /var/log/dora

                  echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},\
${env.BUILD_END},${env.DEPLOY_START},${env.DEPLOY_END},${env.APP_VERSION},${env.BUILD_TYPE},SUCCESS,traditional" \
                    >> /var/log/dora/metrics.csv

                  echo "DORA row logged successfully:"
                  echo "  version:   ${env.APP_VERSION}"
                  echo "  type:      ${env.BUILD_TYPE}"
                  echo "  target:    ${env.DEPLOY_TARGET}"
                  echo "  status:    SUCCESS"
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
${env.BUILD_END ?: ''},${env.DEPLOY_START ?: ''},\$(date -Iseconds),${env.APP_VERSION ?: ''},${env.BUILD_TYPE ?: 'UNKNOWN'},FAILED,traditional" \
                >> /var/log/dora/metrics.csv
              echo "FAILED deployment recorded in DORA log"
            """
        }
        success {
            echo "Pipeline 1 (Traditional) — ${env.BUILD_TYPE} ${env.APP_VERSION} deployed to ${env.DEPLOY_TARGET}."
        }

        always {
            archiveArtifacts(
                    artifacts: 'backend/target/surefire-reports/**',
                    allowEmptyArchive: true
            )
        }
    }
}