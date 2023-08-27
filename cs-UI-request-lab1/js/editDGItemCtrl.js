angular.module("pocApp")
    .controller('editDGItemCtrl',
        function ($scope,item,allTypes) {
            $scope.item = item
            $scope.allTypes = allTypes
            $scope.input = {}

            console.log(allTypes)

            $scope.mult = ['0..0','0..1','0..*','1..1','1..*']

            //when an item is passed in for editing
            if (item && item.ed) {
                $scope.input.description = item.ed.description
                $scope.input.title = item.ed.title
                $scope.input.path = item.ed.path
                for (typ of allTypes) {
                    if (item.ed.type[0] == typ) {
                        $scope.input.type = typ
                    }
                }

                for (var m of $scope.mult) {
                    if (item.ed.mult == m) {
                        $scope.input.mult = m
                    }
                }
            } else {
                $scope.input.mult = $scope.mult[1]      //default to 0..1

                for (typ of allTypes) {
                    if (typ == 'CodeableConcept') {
                        $scope.input.type = typ
                    }
                }
                $scope.isNew = true         //allows cancel
            }

            $scope.save = function() {
                if ($scope.isNew) {
                    let ed = {}
                    ed.type = [$scope.input.type]
                    ed.path = `new.${$scope.input.path}`        //the 'new.' is stripped off, as the full path is passed in for editing existing
                    ed.description = $scope.input.description
                    ed.title = $scope.input.title
                    ed.mult = $scope.input.mult
                    $scope.$close(ed)

                } else {
                    item.ed.description = $scope.input.description
                    item.ed.title = $scope.input.title
                    item.ed.mult = $scope.input.mult
                    $scope.$close(item.ed)
                }

            }
        }
    )