//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('optionsCtrl',
        function ($scope,ed,readOnly) {

            $scope.input = {}
            $scope.ed = ed
            $scope.readOnly = readOnly

            $scope.parseList = function (txt) {
                $scope.ed.options = []
                console.log(txt)
                let lines = txt.split('\n')
                lines.forEach(function (lne) {
                    let option = {}
                    option.pt = lne
                    option.code = lne
                    option.display = lne
                    $scope.ed.options.push(option)

                })
                $scope.input.dirty = true
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
                    option.pt = ar[1]       //set the pt (preferred term) and the display the same. Not sure if we should be using pt anyway...
                    option.display = ar[1]
                    $scope.ed.options.push(option)

                })
                $scope.input.dirty = true
                //console.log(ar)
            }


            $scope.save = function () {
                $scope.$close($scope.ed)
            }

    })