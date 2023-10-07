angular.module("pocApp")
    .controller('historyCtrl',
        function ($scope,$http,name,category) {
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
            }


        })