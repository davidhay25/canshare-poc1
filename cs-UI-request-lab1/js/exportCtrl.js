angular.module("pocApp")
    .controller('exportCtrl',
        function ($scope,hashAllDG,hashAllCompositions) {

            //create the json & TSV download

            let obj = {dg:hashAllDG,comp:hashAllCompositions}

            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))
            $scope.downloadLinkJsonName = `allDataGroups.json`

            $scope.import = function () {
                $scope.$close({dg:$scope.uploadedDG,comp: $scope.uploadedComp})
            }

            $scope.uploadJson = function() {
                let id = "#fileUploadFileRef"    //in qMetadata
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }

                let fileObject = fileList[0]  //is a complex object

                let r = new FileReader();

                //called when the upload completes
                r.onloadend = function (e) {
                    let data = e.target.result;


                    let obj = angular.fromJson(data)
                  //  let allDG = obj
                 //   let allComp;

                    //allows for both versions of the export facility
                    //
                    $scope.uploadedDG = obj //this was the first version

                    if (obj.dg) {
                        //allDG = obj.dg


                        $scope.uploadedDG = obj.dg
                        /* - todo need to think about consequences of this - and what ti do about the library
                        for (key of Object.keys($scope.uploadedDG)) {
                            let dg = $scope.uploadedDG[key]
                            delete dg.checkedOut
                        }
*/

                    }

                    if (obj.comp) {
                        $scope.uploadedComp = obj.comp
                       // allComp = obj.comp
                    }

                    $scope.uploadComplete = true
                   // $scope.uploadedDG = angular.fromJson(allDG)
                    $scope.$digest()

                    console.log(data,$scope.uploadedDG)
                }

                //perform the read...
                r.readAsText(fileObject);
            }
/*

            //this will be for the TSV download
            Object.keys(hashAllDG).forEach(function (key) {
                let dg = hashAllDG[key]


            })
*/


        }
    )