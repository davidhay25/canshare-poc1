angular.module("pocApp")
    .controller('dgDiffCtrl',
        function ($scope,leftDiffDG,rightDiffDG) {
            $scope.leftDiffDG = leftDiffDG
            $scope.rightDiffDG = rightDiffDG

        })