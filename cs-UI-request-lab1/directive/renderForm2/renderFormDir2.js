angular.module('formsApp')
    .directive('renderform2', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            transclude: 'true',  //this is new!!!
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '=',
                hashEd : '=',        //hash of all elementDefinitions by path (=ed)
                technicalview : '=' //show technical items
            },

            templateUrl: 'directive/renderForm2/renderFormDir2.html',
            controller: function($scope,renderFormsSvc2,questionnaireSvc,vsSvc){

                //$scope.vsSvc = vsSvc
                $scope.datePopup = {}
                $scope.dataEntered = {}

                $scope.getOptions = function (ed) {
                    let concepts = []
                    if (ed.valueSet) {
                        let options = vsSvc.getOneVS(ed.valueSet)
                        console.log(options)
                        return options
                    } else {
                        if (ed.options) {
                            return ed.options
                        }
                    }
                    return concepts
                }

                $scope.openDate = function(linkId) {
                    $scope.datePopup[linkId] = {opened:true}
                    // $scope.datePopup.opened = true
                }

                $scope.input = {};
                $scope.input.form = {}        //a hash containing form data entered by the user. It is also updated in the externalQRUpdate handler

                //a hash of items that failed the most current dependency check
                //we used to remove the values of hidden items, but that started causing an infinite digest error when in a directive. dunno why...
                $scope.notShown = {}


                $scope.$watch(
                    function() {return $scope.q},
                    function() {
                        setupQ()
                    }
                );


                function setupQ () {
                    console.log($scope.q)
                    console.log($scope.hashEd)
                    if ($scope.q) {

                        let vo = renderFormsSvc2.makeTreeFromQ($scope.q)
                        $scope.treeData = vo.treeData


/*
                        //show sections
                        vo.treeData.forEach(function (item) {
                            item.state.opened = true
                            if (item.parent == 'root') {
                                item.state.opened = false;
                            }
                        })
*/
                        drawTree(vo.treeData)       //for drawing the tree

                    }

                }



                let drawTree = function(treeData){
                    //console.log(treeData)
                    treeData.forEach(function (item) {
                        item.state = {opened : true}
                        if (item.parent == 'root') {
                          //  item.state.opened = false;
                        }
                    })

                    $('#designTree').jstree('destroy');

                    let x = $('#designTree').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        //seems to be the node selection event...

                        if (data.node) {
                            //$scope.selectedNode = data.node;
                            $scope.selectedItem = data.node.data.item
                            $scope.selectedEd = $scope.hashEd[$scope.selectedItem.linkId]

                            $scope.listItems = renderFormsSvc2.createControlList($scope.selectedItem,$scope.hashEd)
console.log($scope.listItems)

                            console.log(data.node)
                        }

                        $scope.$digest();       //as the event occurred outside of angular...
                    })


                }


                //called when the element receives focus. Sets the control as the current element
                $scope.onFocus = function (item) {
                    $scope.selectedItem = item
                    $scope.selectedEd = $scope.hashEd[$scope.selectedItem.linkId]
                    console.log(item)
                }

                //assume that the hosting app will consume this event & display the VS
                //could do it internally, but seems unnecessary...
                $scope.viewVS = function (url) {
                    $scope.$emit('viewVS',url)
                }



                //called by a cell to indicate if it should be shown
                $scope.showConditional = function (cell,form) {

                    return true

                    if (! cell.meta) {
                        console.log(cell.item.text + " no meta")
                    }

                    //If the item is hidden and the showHidden is not set then return false
                    if (! $scope.input.showHidden &&  cell.meta && cell.meta.hidden) {
                        return false
                    }

                    let copyItem = angular.copy(cell.item)
                    let show = renderFormsSvc.checkConditional(copyItem,form)



                    //if it isn't to be shown, clear any content  (Aug31)

                    //if it isn't to be shown, then set the notShown hash. For some reason, clearing the
                    //value causes infinite digest in some cases - possiblr circular or overly complex - though only started when implementing a directive...
                    $scope.notShown[cell.item.linkId] = ! show
                    if (!show) {
                        //**** this is causing an infinite digest issue with some forms - specifically ancillary studies
                       //delete $scope.input.form[cell.item.linkId]
                     //   $scope.notShown[cell.item.linkId] = true

                        //delete form[cell.item.linkId]
                    }

                    return show

                }

                //code to show (or not) a conditional group - limited to Coding comparisons ATM
                $scope.showConditionalGroup = function(group,form) {

                    return true

                    if (group) {

                        let show = renderFormsSvc.checkConditional(group,form)

                        return show
                    } else {
                        //if not a group then show. child elements will be individually assessed later...
                        return true
                    }



                }



            }
        }
    });