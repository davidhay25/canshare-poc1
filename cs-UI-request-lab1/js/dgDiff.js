angular.module("pocApp")
    .controller('dgDiffCtrl',
        function ($scope,localDG,componentDG) {
            $scope.localDG = localDG
            $scope.componentDG = componentDG
            
            
            function makeElementList() {
                let hash = {}
                $scope.localDG.diff.forEach(function (el) {
                    hash[el.path] = {local:el}
                })

                $scope.componentDG.diff.forEach(function (el) {
                    hash[el.path] = hash[el.path] || {}
                    hash[el.path].component = el

                })

                $scope.rowsHash = hash
                
            }
            makeElementList()

            $scope.selectRow = function (k,v) {
                $scope.selectedPath = k
                $scope.selectedLocalEl = v.local
                $scope.selectedComponentEl = v.component
                compareElements(v.local,v.component)
            }

            function compareElements(local,component) {
                let hash = {}
                for (const attr of Object.keys(local)) {
                    hash[attr] = {local:local[attr]}

                }
                for (const attr of Object.keys(component)) {

                    hash[attr] = hash[attr] || {}
                    hash[attr].component = component[attr]

                    if (hash[attr].component == hash[attr].local) {
                        hash[attr].isEqual = true
                    }

                }

                $scope.elementsHash = hash
                console.log(hash)
            }


        })