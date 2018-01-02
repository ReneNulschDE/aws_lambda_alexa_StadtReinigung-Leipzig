del dist\lambda.zip
7z a -tzip dist\lambda.zip -r *.*
aws lambda update-function-code --function-name muellplan --zip-file fileb://c:/private/aws_lambda_alexa_StadtReinigung-Leipzig/dist/lambda.zip