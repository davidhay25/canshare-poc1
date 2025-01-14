angular.module("pocApp")

    .service('sdcHelperSvc', function(utilsSvc) {

        function makeHash() {
            let hashEd = {}
            for (const item of lstAllElements) {
                hashEd[item.ed.path] = item.ed
            }
            return hashEd
        }

        return {
            
            findVariablesInContext : function (lstAllElements,path) {
                //find all the variables in scope for a given item.
                //Assumes that passed in a DG and the path is the dotted segment format


                let hashEd = makeHash(lstAllElements)

                let ar = path.split('.')

                for (const segment of ar) {

                }




                
            }
            
            
        }
    })