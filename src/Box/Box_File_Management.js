/**
 * @module Box/Box_File_Mangement
 */
const BoxSDK = require('box-node-sdk');
var jsonConfig = require('./box_config.json');
var sdk = BoxSDK.getPreconfiguredInstance(jsonConfig);
const client= sdk.getAppAuthClient('enterprise');

/**
* #currently not implemented, but will be used to grab data from 
* #box if a user passes the proper subjectKey and the feature is enabled
* 
* takes in a box folder Id (string) and returns a downscoped token that is scoped to 
* that folder with only the ability to download. This is used to allow a client to directly 
* access data in a folder for pulling without any other capabilities.
* @param {String} folderId - The box folder id to get access to
*/
async function Get_Dowload_Access_To_Folder(folderId){

    try{
        let downToken=await client.exchangeToken("item_download",`https://api.box.com/2.0/folders/${folderId}`)
        return downToken.accessToken
    }
    catch(e){
        throw Error("Failed to downscope token")
    }
}
/** 
* Takes in a box folder ID and returns a shared link to that folder with 
* default permissions.
* @param {String} folderId - The box folder id to get the link to
*/
async function Make_Download_Link_To_Folder(folderId){
    try{
        let linkCreated = await client.folders.update(folderId, {
            shared_link: {}})
        return linkCreated.shared_link.url
        }
    catch(e){
        throw Error("Failed to make link")
    }
}
/** 
 * Gets all the items' names, types, and ids in a box folder. It then filters the 
 * type by contentType if contentType is passed. baseFolderId and content type 
 * are both strings. All items
 * with the specified infomation are returned in an array of objects.
 * @param {String} baseFolderId - Box folder Id
 * @param {String} contentType - Content type to filter by, should be folder, file, or null
*/
async function Get_Ids_In_Folder(baseFolderId,contentType){
    let itemsInFolders=await client.folders.getItems(baseFolderId,{fields:"name,id,type"})
    let itemEntries=itemsInFolders.entries
    if (contentType){
        newEntries=itemEntries.filter(item=>{
                return item.type===contentType
        })
    return newEntries}
    return itemEntries
}

async function Get_Id_Of_Item_In_Folder(baseFolderId,itemName,contentType){
    /** 
    * Takes a filename and the baseFolderId. If an item exists with the name itemName, 
    * and the right content type, then the id of the item is returned else null is returned
    * @param {String} baseFolderId - Box folder Id
    * @param {String} itemName - file name to look for in folder
    * @param {String} contentType - Content type to filter by, should be folder, file, or null
    */
    let items=await Get_Ids_In_Folder(baseFolderId,contentType)
    for (var i=0;i<items.length;i++){
        if (items[i].name==itemName){
            return items[i].id
        }
    }
    return null
}

async function Folder_Recursive_Build(baseFolderId,recursiveFolderStructure,i){
    /** 
    * builds a box folder according to a file structure such as /data/experiment/subjects
    * if the folder doesn't exist it is created. This is called recursively until the new
    * folder location is created. Upon finishing the recursion, the last folderId is returned
    * @param {String} baseFolderId - Box folder Id
    * @param {Array} recursiveFolderStructure - Nested object of strings with each key pointing
    * to the next layer folder names
    * @param {Number} i - index object to track how deep down the tree the recursion is
    */
    if (i<recursiveFolderStructure.length){
        let itemId=await Get_Id_Of_Item_In_Folder(baseFolderId,recursiveFolderStructure[i],"folder")
        if (itemId){
            return await Folder_Recursive_Build(itemId,recursiveFolderStructure,i+1)
        }
        else{
            let newFolderId=await Create_New_Folder(baseFolderId,recursiveFolderStructure[i])
            if (newFolderId){
                return await Folder_Recursive_Build(newFolderId,recursiveFolderStructure,i+1)
            }
        }
    }
    else{
        return baseFolderId
    }
}
function Get_Tree_From_Path(folderPath){
    /** 
    * Takes in a new folder path, and turns it into an array that can be 
    * traversed. An array of strings is returned
    * @param {String} folderPath - unix folder path
    */
    const folderTreeSplit=folderPath.split("/")
    const folderTreePruned=folderTreeSplit.slice(1,folderTreeSplit.length)
    return folderTreePruned
}
async function Create_New_Folder(baseFolderId,name){
    /** 
     * Creates a new folder in the base folder with the id passed with the 
     * specified name.
     * @param {String} baseFolderId - folder id to add the new folder to
     * @param {String} name - folder name to add
     */
    let folderId=await client.folders.create(baseFolderId,name,{fields:"id"})
    return folderId.id
}
async function Make_Data_Folders(rootID,baseFolderLocation,subtreeLocations){
    /** 
    * Makes a folder at baseFolderLocation from the rootID folder. The folder location
    * is given in the typical file system format. subtreeLocations is an array of 
    * different folder branches that stem out from the baseFolderLocation. Once finished,
    * the folder Ids of the subtreeLocations are returned in an object. 
    * The returned object has keys mapping the subtreeLocations to their respective
    * ids as well as the base folder. 
    * @param {String} rootId - root location ID
    * @param {String} baseFolderId - Id of the base folder that the subtrees branch from
    * @param {Array<String>} subtreeLocations - List of the relative paths of folders to branch 
    * the base folder
    */
    try{
        let outputLocations={subtrees:{},basetree:{}}
        let baseFolderTree=Get_Tree_From_Path(baseFolderLocation)
        if (! (baseFolderTree[0]==="")){
            var baseFolderId=await Folder_Recursive_Build(rootID,baseFolderTree,0)
        }
        else{
            var baseFolderId=rootID
        }
        outputLocations["basetree"][baseFolderLocation]=baseFolderId
        for (var i=0;i<subtreeLocations.length;i++){
            let subtreeTree=await Get_Tree_From_Path(subtreeLocations[i])
            if (!(subtreeTree[0]==="")){
                var subtreeId=await Folder_Recursive_Build(baseFolderId,subtreeTree,0)
            }
            else{
                var subtreeId=baseFolderId
            }
            outputLocations.subtrees[String(subtreeLocations[i])]=subtreeId
        }
        return outputLocations
    }
    catch(e){
        console.log(e)
        throw Error("issue when making box folder")
    }
}
module.exports={
    Make_Download_Link_To_Folder,
    Make_Data_Folders
}