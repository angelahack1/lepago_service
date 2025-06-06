pipeline {
    agent any

    stages {
        stage('Clean Project') {
            steps {
                echo '--- Cleaning the project ---'
                sh 'npm clean'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '--- Installing project dependencies ---'
                sh 'npm install'
            }
        }

        stage('Build Project') {
            steps {
                echo '--- Building the project ---'
                sh 'npm run build'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo '--- Deploying to Kubernetes ---'
                sh 'kubectl apply -f nodeport.yaml'
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