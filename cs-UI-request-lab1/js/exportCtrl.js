angular.module("pocApp")
    .controller('exportCtrl',
        function ($scope,hashAllDG) {

            //create the json & TSV download

            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(hashAllDG,true) ],{type:"application/json"}))
            $scope.downloadLinkJsonName = `allDataGroups.json`

            $scope.import = function () {
                $scope.$close({dgs:$scope.uploadedDG})
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
                //console.log(fileList)

                let r = new FileReader();

                r.onloadend = function (e) {
                    let data = e.target.result;
                    $scope.uploadedDG = angular.fromJson(data)
                    $scope.$digest()

                    console.log(data,$scope.uploadedDG)
                }

                //perform the read...
                r.readAsText(fileObject);
            }


            //this will be for the TSV download
            Object.keys(hashAllDG).forEach(function (key) {
                let dg = hashAllDG[key]


            })



        }
    )