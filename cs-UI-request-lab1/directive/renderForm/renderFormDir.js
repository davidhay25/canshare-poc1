angular.module('pocApp')
    .directive('renderform', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '=',
                qr : '='
            },

            templateUrl: 'directive/renderForm/renderFormDir.html',
            controller: function($scope,renderFormsSvc){

                $scope.datePopup = {}


                $scope.openDate = function(linkId) {
                    $scope.datePopup[linkId] = {opened:true}
                    // $scope.datePopup.opened = true
                }

                $scope.form = {}
                $scope.input = {};

                $scope.$watch(
                    function() {return $scope.q},
                    function() {
                        console.log(renderFormsSvc.makeFormTemplate($scope.q))
                        let vo = renderFormsSvc.makeFormTemplate($scope.q)
                        if (vo) {
                            $scope.formTemplate = vo.template
                        }

                    }
                );


                $scope.makeQR = function() {
                    $scope.qr = renderFormsSvc.makeQR($scope.q, $scope.form)
                    console.log($scope.QR)
                    ///$scope.$emit('qrCreated',$scope.formQR)

                }

                //when a top level item is selected in the tabbed interface
                $scope.selectSection = function(section) {
                    $scope.selectedSection = section
                    console.log(section)
                }

                $scope.showConditional = function (cell) {
                   // console.log(cell)
                    //return true  //<<<<<<<<<<<,

                    if (! cell.meta) {
                        console.log(cell.item.text + " no meta")
                    }

                    //If the item is hidden and the showHidden is not set then return false
                    if (! $scope.input.showHidden &&  cell.meta && cell.meta.hidden) {
                        return false
                    }

                    let show = renderFormsSvc.checkConditional(cell.item,$scope.form)

                    //if it isn't to be shown, clear any content  (Aug31)
                    if (!show) {
                        delete $scope.form[cell.item.linkId]
                    }

                    return show



                }

                //code to show (or not) a conditional group - limited to Coding comparisons ATM
                $scope.showConditionalGroup = function(group) {



                    if (group) {


                        let show = renderFormsSvc.checkConditional(group,$scope.form)

                        return show
                    } else {
                        //if not a group then show. child elements will be individually assessed later...
                        return true
                    }



                }



            }
        }
    });