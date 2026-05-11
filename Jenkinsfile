pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        COMMIT_HASH = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        COMMIT_TIME = sh(script: 'git log -1 --format=%cI', returnStdout: true).trim()

        PUPPET_MASTER_IP = '192.168.56.2'
        PROD_IP = '192.168.56.4'

        NEXUS_URL = 'http://192.168.56.3:8081/repository/tire-testing-releases'
    }

    stages {

        stage('Track Start') {
            steps {
                script {
                    env.PIPELINE_START = sh(script: 'date -Iseconds', returnStdout: true).trim()

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

                withCredentials([usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh '''
                        git config user.email "rrashed4@gmail.com"
                        git config user.name "rashed4949"

                        git remote set-url origin https://$GIT_USER:$GIT_TOKEN@github.com/rashed4949/tire-testing.git

                        git add backend/pom.xml

                        git diff --cached --quiet || git commit -m "ci: bump version [skip ci]"

                        git push origin HEAD:main
                    '''
                }
            }

            post {
                always {
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
                    junit allowEmptyResults: true,
                            testResults: 'backend/target/surefire-reports/*.xml'
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

                sh """
                    HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" \
                        -u jenkins:Raizanhasan4949 \
                        "${NEXUS_URL}/com/myproject/tire-testing/${env.APP_VERSION}/tire-testing-${env.APP_VERSION}.jar")

                    echo "Nexus verification: HTTP \$HTTP_CODE"

                    if [ "\$HTTP_CODE" != "200" ]; then
                        echo "JAR not found in Nexus!"
                        exit 1
                    fi
                """
            }
        }

        stage('Deploy via Puppet') {
            steps {
                script {
                    env.DEPLOY_START = sh(script: 'date -Iseconds', returnStdout: true).trim()
                }

                withCredentials([sshUserPrivateKey(
                        credentialsId: 'vm-ssh-key',
                        keyFileVariable: 'SSH_KEY'
                )]) {
                    sh """
                        ssh -i \$SSH_KEY -o StrictHostKeyChecking=no node1@${PUPPET_MASTER_IP} \
                        "sudo sh -c 'printf -- \"---\\napp_version: ${env.APP_VERSION}\\n\" > /etc/puppet/code/environments/production/hieradata/common.yaml'"

                        ssh -i \$SSH_KEY -o StrictHostKeyChecking=no node3@${PROD_IP} \
                        "sudo /opt/puppetlabs/bin/puppet agent --test --no-daemonize"
                    """
                }
            }

            post {
                always {
                    script {
                        env.DEPLOY_END = sh(script: 'date -Iseconds', returnStdout: true).trim()
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                sh """
                    MAX_ATTEMPTS=3
                    SLEEP=5

                    for i in \$(seq 1 \$MAX_ATTEMPTS); do
                        CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://${PROD_IP}:8081/actuator/health || echo 000)

                        echo "Attempt \$i → \$CODE"

                        if [ "\$CODE" = "200" ]; then
                            echo "Healthy"
                            exit 0
                        fi

                        sleep \$SLEEP
                    done

                    echo "FAILED HEALTH CHECK"
                    exit 1
                """
            }
        }

        stage('Log DORA Metrics') {
            steps {
                sh """
                    mkdir -p /var/log/dora

                    echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},${env.BUILD_END},${env.DEPLOY_START},${env.DEPLOY_END},SUCCESS,traditional" \
                    >> /var/log/dora/metrics.csv
                """
            }
        }
    }

    post {
        failure {
            sh """
                echo "${COMMIT_HASH},${COMMIT_TIME},${env.PIPELINE_START},${env.BUILD_END},${env.DEPLOY_START},\$(date -Iseconds),FAILED,traditional" \
                >> /var/log/dora/metrics.csv
            """
        }

        success {
            echo "Deployment successful: ${env.APP_VERSION}"
        }

        always {
            archiveArtifacts artifacts: 'backend/target/surefire-reports/**', allowEmptyArchive: true
        }
    }
}