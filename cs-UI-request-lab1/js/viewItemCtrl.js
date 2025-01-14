//controller for the 'showComposition' include
angular.module("pocApp")
    .controller('viewItemCtrl',
        function ($scope,item,Q) {

            $scope.item = item
            
            
            //get the hierarchy for this item

            function getChainToNode(node, targetId, chain = []) {
                // Add the current node to the chain

                let clone = angular.copy(node)
                let itemDisplay = "Child elements: "
                if (clone.item) {
                    for (const item of clone.item) {
                        itemDisplay += item.linkId + " "
                    }
                    delete clone.item
                }

                clone.children = itemDisplay
                const newChain = [...chain, clone];

                // Check if the current node is the target
                if (node.linkId === targetId) {
                    return newChain; // Return the chain if the target is found
                }

                // Traverse children if they exist
                if (node.item && node.item.length > 0) {
                    for (const child of node.item) {
                        const result = getChainToNode(child, targetId, newChain);
                        if (result) return result; // Stop when the target is found
                    }
                }

                return null; // Return null if the target is not found in this branch
            }





            let tree = {linkId:'root',item:Q.item}

            $scope.chain = getChainToNode(tree,item.linkId)
            if ($scope.chain) {
                $scope.chain.splice(0,1)
                $scope.selectedItem = $scope.chain[$scope.chain.length -1]
            }


            $scope.selectItem = function (item) {
                $scope.selectedItem = item
            }




    })