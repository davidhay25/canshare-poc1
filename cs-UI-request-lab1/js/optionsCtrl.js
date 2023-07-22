//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('optionsCtrl',
        function ($scope,ed) {

            $scope.input = {}
            $scope.ed = ed

            $scope.parseList = function (txt) {
                $scope.ed.options = []
                console.log(txt)
                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let option = {}
                    option.pt = lne
                    $scope.ed.options.push(option)

                })
                $scope.input.dirty = true
                //console.log(ar)
            }


            $scope.parseSnomed = function (txt) {
                $scope.ed.options = []
                console.log(txt)
                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let ar = lne.split('\t')
                    console.log(ar)
                    let option = {}
                    option.code = ar[0]
                    option.pt = ar[1]
                    $scope.ed.options.push(option)

                })
                $scope.input.dirty = true
                //console.log(ar)
            }


            $scope.save = function () {
                $scope.$close($scope.ed)
            }

    })