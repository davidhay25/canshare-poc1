# Canshare application

This repo holds all the source code for the CanShare application with
the exception of the forms functionality, including the modeller
the creates the Questionnaires and the Questionnaire Viewer. They are
in a separate repo as the codebase is shared with clinFHIR.




## Folders

Many folders are no longer used (and will be removed at some point.)
The ones that are used:

### cs-docker
Docker compose files for the whole canshare app. Different versions
for test (backup) and production 


[README file](cs-docker/README.md)

### cs-portal
The front page for the Canshare app. Deployed as a docker container
named **davidhay25/canshare-portal** and can be build by the
**docker-build.sh** script

[README file](cs-portal/README.md)

### cs-UI-request-lab1
The main canshare app. Includes modules
* ValueSet Viewer (vsLookup.html)
* ValueSet Editor (updateVS.html)
* ConceptMap importer (updateCM.html)
* ConceptMap viewer (cmTester.html)
* LIM viewer (models.html)

[README file](cs-UI-request-lab1/README.md)