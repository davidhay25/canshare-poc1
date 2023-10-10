angular.module("pocApp")
    .controller('historyCtrl',
        function ($scope,$http,name,category,currentModel) {
            $scope.name = name
            let url = `/model/DG/${name}/history`
                $http.get(url).then(
                    function (data) {
                            $scope.hx = data.data
                    },
                    function(err) {
                            alert (angular.toJson(err))
                    }
                )


            $scope.selectItem = function (item) {
                $scope.selectedItem = item
                createDiff()
            }


            //create the current hash
            let hashCurrent = {}
            currentModel.diff.forEach(function (ed) {
                hashCurrent[ed.path] = ed
            })


            //create a diff array between the current model and the selected one
            function createDiff() {
                // create hash of selected
                let hashSelected = {}

                currentModel.diff.forEach(function (ed) {
                    hashSelected[ed.path] = ed
                })

                $scope.diffItems = []

                Object.keys(hashCurrent).forEach(function (key) {
                    let diffItem = {}
                    diffItem.path = key
                    diffItem.current = hashCurrent[key]
                    if (hashSelected[key]) {
                        //the selected one has this path
                        diffItem.selected = hashSelected[key]
                        delete hashSelected[key]    //anything left will have been deleted
                    }
                    $scope.diffItems.push(diffItem)

                })


                //now add any elements in the selected and not the current
                Object.keys(hashSelected).forEach(function (key) {
                    let diffItem = {}
                    diffItem.path = key
                    diffItem.selected = hashSelected[key]
                    $scope.diffItems.push(diffItem)

                })


            }


        })