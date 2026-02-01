# CanShare source code
The source code for the CanShare application.

There are a lot of unused files here - due to the way that the app has
evolved over the years. Anything (fileName or function name) ending in
DEP is deprecated, but not all unused artifacts are so named.

# Key folders

## artifacts
ConceptMap configuration files are the most significant

## css
The CSS source files. **common.css* are the canshare ones - the others
are for libraries

## directive
Directives used in the app. Most are no longer used. **renderForm2** is 
used in the form app. 
> todo: is this folder used here

## fonts
used by libraries

## icons
Canshare logo and tree icons 

## images

> todo - rationize icons and images

## includes
AngularJs include files. Extensively used

## js
All the javascript functions. Naming conventions
* ends in Ctrl - an angular controller
* ends in Svc - an angular service
* The controller for a main html file will have the same name for its controller
eg *updateCM.html* has *updateCMCtrl.js* as the controller



## modelTemplates
All the html files for modal screens. There are lots of them. In general
the controllers are separate files in the js folder

# NodeJs server

Named **pocServer**

# Updating

## Pushing updates

To push an update to the canshare app, but leave the other services
untouched:

1. Move to the **cs-UI-request-lab1** folder 
2. execute **docker-build.sh**
3. ssh to the remote server
4. cd **/opt/canshare-docker**
5. either:
    * execute **refresh.sh** for a full rebuild
    * or (assuming it's the canshare service that is to be updated)
      * **docker compose pull canshare** 
      * **docker compose up -d --no-deps canshare**



## License

This project is licensed under the Apache License 2.0 – see the [LICENSE](LICENSE) file for details.
