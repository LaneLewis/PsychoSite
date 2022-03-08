# Exius
Exius is a niche dockerized web api that allows users to make controlled web endpoints for uploading data. It was specifically built to handle uploads from insecure locations such as static, public websites that need a lot of specificity in what a client should be able to upload. 
## How it works
* A github organization admin creates an instance of Exius on a web server and binds it to their organization with a github admin developer key. They also set who can create endpoints to box within their organization and the base folder in box that members can upload to.
* Organization members with the specified credentials then can create Template Keys, which create a set of form data upload endpoints to a specific box folder and is tied to a repository. Within the template key, they can give highly specific limitations on what can be uploaded such as file types, number of files, max number of file updates, ect. In addition, they can protect it with a password and specify the number of Write Keys that the Template Key can create.
* Clients then can request Write Keys by submitting a Template Key and the requisite password. If valid, it will create a Write Key drawn from the the Template Key parameters with all the limitations of that specific Template Key. The Write Key number is then passed to the client.
* The client can then upload files to Exius with the Write Key. Everytime that an upload is attempted with a Write Key, the state of the Write Key is updated to account for the number of files uploaded, what the files were ect. If an upload is attempted beyond the scope of the Write Key, it is rejected.
* Github users with access to the specific repository tied to the Template Key can then view the data uploaded to that particular box folder as well as manage the Template Key and all its children Write Keys.
## Under the Hood
Exius uses Docker Compose to containerize the application and make it easy to deploy on any server. The built Exius container is then paired with a JWILDER/NGINX-Letsencrypt proxy that allows the API to be accessed over HTTPS for free on a subdomain. Internally, it is written in Nodejs with Express for quick I/O. The Keys are maintained in an SQLite database with a table containing every Write Key for each Template Key created as well as a central table for the Template Keys. The Github api calls are made with the Octocat SDK and the Box api calls are done with the Box sdk.
## Setting Up Your Own Exius Instance
You will need several things to create your own Exius instance. A JWT json credential file from Box, an admin key .
* JWT json credential file from Box. This allows you to connect to your own Box account. This will need to replace box_config.json at Exius/Box/box_config.json, and should be named box_config.json.
* A Github organization with an Admin Developer Key. This will be used by Exius to check if a user has access to create and modify Template Keys. The name of the organization should replace the name of the environment variable ADMIN_GIT_KEY in the docker-compose file. The organization name should replace the environment variable GIT_ORG.
* An email to give to the JWILDER/LetsEncrypt proxy that will send updates if a certificate has issues. This should passed to the environment variable LETS_ENCRYPT_EMAIL.
* A subdomain. This is where the api will be available over https. The subdomain should be passed to the environment variables LETS_ENCRYPT_HOST and VIRTUAL_HOST.
# Documentation 
[https://lanelewis.github.io/Exius](https://lanelewis.github.io/Exius)
# Use Case
Exius's primary use case is to be the backend storage system for the in-development psychology experiment platform, PsychoSite.
