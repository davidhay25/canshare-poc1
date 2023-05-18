angular.module('formsApp')
    .directive('renderform', function () {
        return {
            restrict: 'EA', //E = element, A = attribute, C = class, M = comment
            transclude: 'true',  //this is new!!!
            scope: {
                //@ reads the attribute value, = provides two-way binding, & works with functions
                q: '=',
                qr : '=',
                form : "="          //todo I don't think this is being used & could be removed when I get back to the forms app
            },

            templateUrl: 'directive/renderForm/renderFormDir.html',
            controller: function($scope,renderFormsSvc,$timeout){

                $scope.datePopup = {}

                //called when the question mark icon is clicked...
                $scope.showItemDetails = function(item,meta) {
                    //emit as an event so the hosting app can do something with it...
                    let clone = angular.copy(item)
                    delete clone.item
                    $scope.$emit('itemDetail',{item:clone,meta:meta})

                  //  console.log(item,meta)
                }

                $scope.$on('commentsUpdated',function(ev,vo) {
                   // console.log('commentsUpdated in dir', vo.hashComments)
                    $scope.hashComments = vo.hashComments  //the comments are incorproated into the QR my makeQR
                    $scope.makeQR()         //create a new QR that will have the comments


                })



                /* - I don't believe this is now used

                $scope.$on("externalQRUpdate",function(ev,vo){
                    //console.log("externalQRUpdate")
                    $scope.qr = vo.QR
                    console.log(vo.formData)

                    //if the source was something else - ie the tree - then add the formdata to the local set of data
                    //this is especially the reviewer comments..
                    if (vo.source !== 'form') {
                        Object.keys(vo.formData).forEach(function (key) {
                            $scope.input.form[key] = vo.formData[key]
                        })
                    }

                    //not working...  renderFormsSvc.setControls($scope.input.formTemplate,$scope.input.form)
                  //  $scope.makeQR() - causes a stack overflow
                })
*/
                

                //for some reason when the q changes, the change doesn't ripple through to the directive, so $scope.$broadcast is needed
                //this is used by the designer...
                $scope.$on("q-updated",function(){
                   // console.log("q updated broadcast")
                    if ($scope.q) {
                        $timeout(function(){

                            $scope.input.form = {}    //todo - is this right re-set all the form data when re-building the template

                            let vo = renderFormsSvc.makeFormTemplate($scope.q, $scope.input.form)
                            if (vo) {
                                $scope.input.formTemplate = vo.template
                                $scope.hashItem = vo.hashItem

                            }
                        },1000)
                    }
                })


                //if there is already data for an item, update the 'initial' value of the corresponding Q
                //this will set the contron (dropdown & bool) to the value
                let setupInitial = function () {
                    //right now, doing this in lab (as it's the only area where pre-pop is currently done. refactor if needed

                }

                $scope.resetForm = function() {
                    let msg = "Resetting the form will clear all form data and feedback. Please submit feedback prior to resetting. Are you sure you wish to continue?"

                    if (confirm(msg)) {
                        $scope.input.form = {}  //reset all the data
                        setupQ()
                    }


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

                //if the form variable is set from the outside, it is assumed to contain data in the same format as input.form - a hash of values by linkId
          /* not sure if this is used      $scope.$watch(
                    function() {return $scope.form},
                    function() {
                        //don't do this here ATM. Right now this is being done for labs in labSvc - if needed elsewhere then refactor
                        //I think there will be an issue with non-simple values


                    }
                )
*/
                $scope.$watch(
                    function() {return $scope.q},
                    function() {
                      // console.log('Q updated')
                        setupQ()
                                           }
                );

                function setupQ () {
                    delete $scope.selectedSection       //c;ears the current section display
                    if ($scope.q) {
                        let vo = renderFormsSvc.makeFormTemplate($scope.q,$scope.input.form)
                        if (vo) {
                            $scope.input.formTemplate = vo.template     //an array of sections
                            $scope.hashItem = vo.hashItem
                            $scope.selectSection($scope.input.formTemplate[0])  //select the first tab
                            $scope.makeQR()     //will include any .initial values
                        }
                    }
                }


                //called when the element receives focus. Emits an event so the host can display stuff
                $scope.onFocus = function (cell) {
                    console.log(cell)
                    $scope.$emit('elementSelected',{cell:cell})

                }



                //note that this is called every time there is a change (eg keypress) in the forms component
                //this is to ensure that the QR is always up to date. onBlur could miss the most recently updated firld...
                $scope.makeQR = function() {

                    //before building the QR, the comments from the tree need to be incorporated.
                    //use a clone of the model data so the displayed form is not updated
                    let formData = angular.copy($scope.input.form)

                    //updates the items marked as comments (using the code.system)
                    //If I was doing this again I'd use an extension, but that will require updating the disposer. Perhaps another time...
                    renderFormsSvc.addCommentsToModel($scope.q,$scope.hashComments,formData)


                    //$scope.qr = renderFormsSvc.makeQR($scope.q, $scope.input.form)
                    $scope.qr = renderFormsSvc.makeQR($scope.q, formData)
                    //emit the QR so it can be captured by the containing hierarchy. Otherwise the scopes get complicated...
                    $scope.$emit('qrCreated',{QR:$scope.qr,formData:$scope.input.form,hashItem:$scope.hashItem,source:'form'})

                }

                //when a section is selected
                $scope.selectSection = function(section) {



                    //section.imageDetails = {imageName:"left-breast.png",linkId:"image"}        //temp
                    $scope.selectedSection = section
                    if (section.imageDetails) {
                        //the section has an associated image. load and display it

                        setDrawing(section.imageDetails.imageName)

                        $scope.formPane = "col-md-6"
                        $scope.drawingPane = "col-md-3"
                    } else {
                        $scope.formPane = "col-md-9"
                        $scope.drawingPane = "col-md-0"
                        clearDrawing()
                    }
                }

                $scope.resetDrawing = function(){
                    setDrawing($scope.selectedSection.imageDetails.imageName)
                    delete $scope.input.form[$scope.selectedSection.imageDetails.linkId]
                    $timeout(function(){
                        $scope.makeQR()
                    },100)
                }

                clearDrawing = function() {
                    let canvas = document.getElementById('drawingCanvas')
                    let context = canvas.getContext('2d')
                    context.clearRect(0, 0, canvas.width, canvas.height);
                }

                setDrawing = function (imageName) {
                    let canvas = document.getElementById('drawingCanvas')
                    let context = canvas.getContext('2d')
                    const image = new Image()
                    image.src = `images/${imageName}`
                    image.onload = function () {
                        context.drawImage(image, 0, 0)
                    }

                    canvas.addEventListener('mousedown', function(event) {
                        //console.log('dn',event.offsetX,event.offsetY)
                        // isDrawing = true;
                        startX = event.offsetX;
                        startY = event.offsetY;
                        context.beginPath();
                        context.arc(startX, startY, 7, 0, 2 * Math.PI);
                        context.stroke();

                        $scope.input.form[$scope.selectedSection.imageDetails.linkId] = canvas.toDataURL()
                        $timeout(function(){
                            $scope.makeQR()
                        },100)


                    });

                }

                //called by a cell to indicate if it should be shown
                $scope.showConditional = function (cell,form) {

                    if (! cell.meta) {
                        console.log(cell.item.text + " no meta")
                    }

                    //If the item is hidden and the showHidden is not set then return false
                    if (! $scope.input.showHidden &&  cell.meta && cell.meta.hidden) {
                        return false
                    }

                    let copyItem = angular.copy(cell.item)
                    let show = renderFormsSvc.checkConditional(copyItem,form)

                    //console.log(show)
                    //return true  //<<<<<<<<<<<,

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