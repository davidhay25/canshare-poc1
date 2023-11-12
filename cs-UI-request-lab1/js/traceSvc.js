//Trace activities
angular.module("pocApp")

    .service('traceSvc', function(modelsSvc,$localStorage) {
     //   $localStorage.trace = $localStorage.trace || {contents:[]}    //actions

        return {
            addAction : function (action) {
                console.log(action)
                //add an action that a user has done. Format can vary, but can be:
                //description: - what the user was doing
                //model: - the value of the model (DG or Comp) after the action occurred
                //
                if ($localStorage.trace.on) {
                    let clone = angular.copy(action)
                    if (clone.model) {
                        delete action.model.changes
                    }

                    $localStorage.trace.contents = $localStorage.trace.contents || []
                    $localStorage.trace.contents.push(clone)  //make it a clone so subsequent changes to the model don't effect things

                    //if over the limit size wise - remove the first one
                    let limit = $localStorage.trace.limit || 500
                    if ($localStorage.trace.contents.length > limit) {
                        $localStorage.trace.contents.splice(0,1)
                    }

                }

                //check that the memory & locatstorage are the same
                if (action.model && action.model.kind == 'dg') {
                    console.log("validate DG")
                    //make sure that $localStorage has been updated
                    if (angular.toJson(action.model) !== angular.toJson($localStorage.world.dataGroups[action.model.name])) {
                        alert("Warning! the Browser copy of the DG doesn't match the copy in memory! You should re-load the page and check it.")
                    }
                }

            },
            getActions : function () {
                let traceHistory = angular.copy($localStorage.trace.contents)
                return traceHistory
            },
            getTraceSize : function () {
                let size = modelsSvc.getSizeOfObject($localStorage.trace)
                 return parseInt(size/1024)
            },
            resetTrace : function () {
                $localStorage.trace = {}

            }
        }
    })