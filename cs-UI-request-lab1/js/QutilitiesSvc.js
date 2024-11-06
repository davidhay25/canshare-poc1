
//utilities for the Q builder - both DG and Composition

angular.module("pocApp")

    .service('QutilitiesSvc', function() {
        let cache = {}

        this.fhir = {}


        return {


            updateEWSourcePath : function(currentPath,sourcePath) {



                //adjustment for embedded DG path. This occurs when a DG with a conditional
                //is a child element of another DG. The path of the source (the controlling element)
                //is not correct - it needs to be adjusted to allow for the containing DG
                let arControllerPath = sourcePath.split('.')  //the control element - question / source
                let arThisPath = currentPath.split('.')      // this ed - the one that is dependant

                let source = sourcePath
                //console.log(arThisPath[0],arControllerPath[0])
                if (arThisPath[0] !== arControllerPath[0]) {
                    //This is an ew in a 'contained' DG
                    let diff = Math.abs(arThisPath.length - arControllerPath.length)
                    if (arThisPath.length > arControllerPath.length) {

                        let ar = arThisPath.slice(0,diff)
                        arControllerPath = ar.concat(arControllerPath)
                        source = arControllerPath.join('.')
                    } else {
                        console.log("EnableWhen paths don't seem right...")
                        //not sure if this is ever true - or what to do if it is!
                        //probably remove the extra elements from source???
                        //let ar = arControllerPath.slice(diff)
                        // arThisPath = ar.concat(arThisPath)
                        //source = arThisPath.join('.')
                    }

                }

                return source

            },


        }})