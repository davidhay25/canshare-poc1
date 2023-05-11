angular.module('formsApp')
    .directive('renderformastree', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            transclude: 'true',  //this is new!!!
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '=',
                qr : '=',
                form: '='
            },

            templateUrl: 'directive/renderForm/renderFormAsTreeDir.html',
            controller: function($scope,renderFormsSvc,$timeout,$rootScope){

                // #changed



                $scope.form = {}        //a hash containing form data entered by the user
                $scope.input = {};

                $scope.input.comments = {}      //comments entered against an individual item

                $scope.datePopup = {}
                $scope.openDate = function(linkId) {
                    $scope.datePopup[linkId] = {opened:true}
                }

                //a hash of items that failed the most current dependency check
                //we used to remove the values of hidden items, but that started causing an infinite digest error when in a directive. dunno why...
                $scope.notShown = {}

                $scope.$on('externalQRUpdate',function (ev,vo) {
                    console.log('externalQRUpdate')
                    $scope.qr = vo.QR


                    //if the source was something else - ie the form - then add the formdata to the local set of data
                    //this is especially the reviewer comments..
                    if (vo.source !== 'tree') {
                        Object.keys(vo.formData).forEach(function (key) {
                            $scope.form[key] = vo.formData[key]
                        })
                    }
                   // $scope.makeQR()
                })
/*
                $scope.$watch(
                    function() {return $scope.qr},
                    function() {
                        console.log('QR updated')
                    })
*/
                $scope.$watch(
                    function() {return $scope.q},
                    function() {

                        if ($scope.q) {
                            //$scope.selectedQ = $
                            console.log('Q updated')
                            delete $scope.selectedNode
                            let vo = renderFormsSvc.makeTreeFromQ($scope.q)
                            //$scope.hashItem = vo.hashItem
                            $scope.hashAllItems = vo.hashItem

                            //console.log(vo.treeData)
                            //show sections

                            vo.treeData.forEach(function (item) {
                                item.state = item.state || {}
                                item.state.opened = true
                                if (item.parent == 'root') {
                                    item.state.opened = false;
                                }
                            })

                            $scope.treeData = vo.treeData
                            drawTree(vo.treeData)       //for drawing the tree


                        }

                    }
                );


                $scope.addNewCommentDEP = function(txt,item,groupComment) {
//console.log(txt,item,groupComment)

                    // #changed

                    //$scope.selectedNode.data.meta.comment = $scope.input.newComment


                    $scope.form[groupComment.linkId] = $scope.form[groupComment.linkId] || ""
                    $scope.form[groupComment.linkId] += item.text + ": " + txt + "\n"

                    //delete $scope.input.newComment



                    $scope.makeQR()
                }

                $scope.showConditional = function(){
                    return true
                }

                let drawTree = function(treeData){

                    $('#reviewTree').jstree('destroy');

                    let x = $('#reviewTree').jstree(
                        {'core': {'multiple': false, 'data': treeData, 'themes': {name: 'proton', responsive: true}}}
                    ).on('changed.jstree', function (e, data) {
                        //seems to be the node selection event...

                        if (data.node) {
                            delete $scope.selectedGroup
                            delete $scope.input.newComment
                            $scope.selectedNode = data.node;

                            // #changed
                            $scope.input.newComment = $scope.selectedNode.data.meta.comment || ""
                            //console.log(data.node)


                            //

                            //this will update the item display in the right pane
                            //todo - may no longer be needed if we don't allow data entry via the tree
                            $scope.cell = {item:$scope.selectedNode.data.item} //it's an item
                            $scope.cell.meta = renderFormsSvc.getMetaInfoForItem($scope.selectedNode.data.item) // {}   //todo - may want to populate this...

                            //if the item has sub-items, then it is either a group or a section
                            if ($scope.cell.item) {
                                $scope.selectedGroup = $scope.cell.item
                            }
                        }
                        $scope.$digest();       //as the event occurred outside of angular...
                    })
                }


                //The tree view doesn't allow data entry, so it cannot create a QR. Instead it
                //uses $emit to send the hash of comments to the parent app.

                $scope.updateComments = function () {
                    $rootScope.$broadcast('commentsUpdated',{hashComments:$scope.input.comments})

                }


                $scope.makeQRDEP = function() {
console.log('makeQR')
                    //need to add the individual comments against items (in $scope.input.comments) to the form data (in $scope.form)





                    $scope.qr = renderFormsSvc.makeQR($scope.q, model,$scope.hashItem)
                    //$scope.qr = renderFormsSvc.makeQR($scope.q, $scope.form,$scope.hashItem)


                    //emit the QR so it can be captured by the containing hierarchy. Otherwise the scopes get complicated...
                    $scope.$emit('qrCreated',{QR:$scope.qr,formData:$scope.form,hashItem:$scope.hashItem,source:'tree'})

                }

                //when a top level item is selected in the tabbed interface
                $scope.selectSection = function(section) {
                    $scope.selectedSection = section
                    //console.log(section)
                }


            }
        }
    });