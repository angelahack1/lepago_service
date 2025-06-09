pipeline {
    agent any

    stages {
        stage('Clean Project') {
            steps {
                echo '--- Cleaning the project ---'
                bat 'kubectl delete -f nodeport.yaml --ignore-not-found=true'
                bat 'pause 10'
                bat 'kubectl delete -f nodeport.yaml --ignore-not-found=true'
                bat 'pause 10'
                bat 'docker image rm -f lepagoservice:1.0 || true'
                bat 'pause 10'
                bat 'docker image rm -f lepagoservice:1.0 || true'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '--- Installing project dependencies ---'
                bat 'npm install'
            }
        }

        stage('Build Project') {
            steps {
                echo '--- Building the project ---'
                bat 'npm run build'
                bat 'copy E:\Developments\lepago_service\.env.local .env.local'
                bat 'pause 5'
                bat 'docker build -t lepagoservice:1.0 .'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo '--- Deploying to Kubernetes ---'
                bat 'kubectl apply -f nodeport.yaml'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo 'Project successfully deployed!'
        }
        failure {
            echo 'Pipeline failed. Please check the console output.'
        }
    }
}