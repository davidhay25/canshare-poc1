angular.module("pocApp")
    .controller('exportCtrl',
        function ($scope,hashAllDG,hashAllCompositions,meta,utilsSvc) {

            //create the json & TSV download
            $scope.input = {}

            let fhirDT = utilsSvc.fhirDataTypes()

            let obj = {dg:hashAllDG,comp:hashAllCompositions}
            obj.meta = meta

            $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(obj,true) ],{type:"application/json"}))

            $scope.downloadLinkJsonName = `allDataGroups.json`
            if (meta.name) {
                $scope.downloadLinkJsonName = `${meta.name}.json`
            }

            $scope.import = function () {

                $scope.$close($scope.uploadedWorld)
            }

            $scope.uploadJson = function() {
                let id = "#fileUploadFileRef"    //in qMetadata
                let file = $(id)
                let fileList = file[0].files
                if (fileList.length == 0) {
                    alert("Please select a file first")
                    return;
                }

                let fileObject = fileList[0]  //is a complex object

                let r = new FileReader();

                //called when the upload completes
                r.onloadend = function (e) {
                    let data = e.target.result;

                    let obj = angular.fromJson(data)
                    $scope.uploadedWorld = obj

                    $scope.uploadedDG = obj //this was the first version

                    if (obj.dg) {
                        $scope.uploadedDG = obj.dg
                    }

                    if (obj.comp) {
                        $scope.uploadedComp = obj.comp
                    }

                    $scope.uploadComplete = true

                    $scope.$digest()


                }

                //perform the read...
                r.readAsText(fileObject);
            }




            $scope.parseSS = function (file) {

                let cloneHashDG = angular.copy(hashAllDG)

                const cols = {
                    DGName: 0,
                    DGParent: 1,
                    DGTitle: 2,
                    DGDescription: 3,
                    EleName: 4,
                    EleCode: 5,
                    EleTitle: 6,
                    EleType: 7,
                    EleDescription: 8,
                    EleCardinality : 9,
                    EleValueSet: 10,
                    EleNote: 11

                }

                //let arLines = []
                let arLines = file.split('\n')

                //take off the first 2 lines
                arLines.splice(0,2)

                //Add all the DGs first. That means we can do type checking as we parse the other cintents
                for (const lne of arLines) {
                    let ar = lne.split(`\t`)
                    let DGName = ar[cols.DGName]

                    if (DGName && ! cloneHashDG[DGName]) {
                        //this is a new DG
                        let newDG = {kind: 'dg', name: DGName, title: ar[cols.DGTitle], diff: []}
                        newDG.id = utilsSvc.getUUID()
                        let parent = ar[cols.DGParent]
                        if (parent) {
                            newDG.parent = parent
                        }
                        cloneHashDG[DGName] = newDG
                    }
                }


                //let hashDG = {}
                let currentDG
                //now create the DG's from the file
                let errors = []
                let inx = 2     //line counter for errors
                for (const lne of arLines) {
                    let ar = lne.split(`\t`)
                    inx++
                    if (ar[cols.DGName] || ar[cols.EleName]) {



                        let DGName = ar[cols.DGName]
                        if (DGName) {

                            //check if this is a new DG. If one exists with the same name
                            //then update the elements from the SS - leave the others.
                            //this allows modification of other elements in the tool

                            currentDG = cloneHashDG[DGName]     //we know its there as we addded them above...
/*
                            if (cloneHashDG[DGName]) {
                                currentDG = cloneHashDG[DGName]
                            } else {
                                //this is a new DG
                                let newDG = {kind: 'dg', name: DGName, title: ar[cols.DGTitle], diff: []}
                                let parent = ar[cols.DGParent]
                                if (parent) {
                                    newDG.parent = parent
                                }
                                cloneHashDG[newDG.name] = newDG
                                currentDG = newDG
                            }
                            */

                        } else {
                            //these are elements in the DG currently being parsed

                            //todo - need to check is there is already an ED in this DG with this name
                            //if there is then we update the existong one (to preserve other changes)
                            //if not then we create a new one

                            let path = ar[cols.EleName]
                            let isNewED = false

                            let ed
                            let ar1 = currentDG.diff.filter(ed => ed.path == path)
                            if (ar1.length == 1) {
                                ed = ar1[0]
                            } else {
                                isNewED = true
                                ed = {path: path}
                            }


                            let type = ar[cols.EleType]
                            if (! type) {
                                errors.push(`Line ${inx} - type is required`)
                            } else {
                                if (fhirDT.indexOf(type) > -1 || cloneHashDG[type]) {
                                    ed.type = [type]
                                } else {
                                    errors.push(`Line ${inx} - type '${type}' is unknown`)
                                }


                            }

                            ed.mult = ar[cols.EleCardinality] || "0..1"

                            let code = ar[cols.EleCode]
                            if (code) {
                                //format = code | display. system is snomed
                                let ar = code.split('|')
                                let coding = {system: 'http://snomed.info/ct'}
                                coding.code = ar[0].replace(/\s+/g, '');
                                if (ar[1]) {
                                    coding.display = ar[1]
                                }
                                ed.itemCode = coding
                            }

                            addIfNotEmpty(ed, 'title', ar, cols.EleTitle)
                            ed.title = ar[cols.EleTitle] || ar[cols.EleName]

                            addIfNotEmpty(ed, 'description', ar, cols.EleDescription)
                            addIfNotEmpty(ed, 'valueSet', ar, cols.EleValueSet)
                            addIfNotEmpty(ed, 'notes', ar, cols.EleNote)


                            if (isNewED) {
                                currentDG.diff.push(ed)
                            }

                        }
                    }
                }

                console.log(cloneHashDG,errors)

                //todo check dattypes - need to wait until all DGs created


                return {hashAllDG: cloneHashDG,errors:errors} //hashDG


                function checkNotEmpty(v,message) {
                    if (! v) {
                        errors.push(message)
                        return false
                    }
                    return true

                }

                function addIfNotEmpty(obj,key,ar,inx) {
                    let v = ar[inx]
                    if (v) {
                        obj[key] = v
                    }

                }




                //console.log(arLines.length)

                //the second line has line numbers. in the second cell is the domain
               // let lne = arLines[1]
               // let ar1 = lne.split('\t')

            }

            $scope.importFromSS = function (file) {
                let vo = $scope.parseSS(file)




                if (vo.errors.length == 0) {
                    let hashDG = vo.hashAllDG
                    let world = {dg:hashDG,comp:{}}
                    $scope.$close(world)
                } else {
                    $scope.errors = vo.errors
                }


            }

        }
    )