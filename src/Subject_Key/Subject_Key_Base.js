/**
 * @module Write_Key/Write_Key_Base
*/
let {Does_Table_Exist,
    Delete_Table_Entry,
    Retrieve_All_From_Table,
    Insert_Object_Into_Table,
    Get_By_Key,
    Update_Table_From_Obj}=require("../SQL/SQL_Functions" )

let {Iterate_Relay_Params,
    Get_Relay_Params} = require("../Relay/Relay_Base")

let { Make_Data_Folders }=require("../Box/Box_File_Management")
    /**
     * Checks if relay exists, if it does the relayParams
     * are pulled and attempted to be iterated. If the relay pulls would go over the maxRelayPulls
     * of the relay an error is thrown. A random number of length 7 is then 
     * checked to see if it exists in the subjectKey db, this is attempted up
     * to a maximum of 5 times. If successful, a new write key is created 
     * from the relayName with the fields uploadState (a mapping of endpoints to 
     * scope and an empty file objects), subjectKey (the subjectKey number),pullNumber 
     * (the pull count when the key was created), metaData (any attached metaData
     * from the function call).
     * @param {String} relayName - subject key name
     * @param {String} metaData - metaData to attach to the subjectKey
     */
    async function Add_Subject_Key(relayName,metaData=""){
        if (! Does_Table_Exist(relayName)){
            throw Error("relay table does not exist")
        }
        let relay=Get_Relay_Params(relayName)
        if (! relay){
            throw Error("relay entry does not exist in Relays")
        }
        if (relay.currentRelayPulls+1>relay.maxRelayPulls){
            throw Error("Access key out of uses")
        }
        for (var i =0; i<5; i++){
            var randomKey=Random_Number_N_Digits(7)
            if (! Get_By_Key({subjectKey:randomKey},`'${relayName}'`)){
                break
            }
            if (i == 4){
                throw Error("Collision retry limit exceeded")
            }
        }
        let uploadState={}
        try{
            for (var [key, value] of Object.entries(relay.writeEndpoints)){
                await Create_Custom_Path(value,randomKey,relay.currentRelayPulls)
                uploadState[key]={scope:value,files:{}}
            }
        }
        catch(e){
            throw Error("Error while building endpoints")
        }
            try{
                let addToTable={
                    subjectKey:randomKey,
                    uploadState:uploadState,
                    relayNumber:relay.currentRelayPulls,
                    metaData:metaData}
                let success = Insert_Object_Into_Table(addToTable,`'${relayName}'`)
                if (success){
                    Iterate_Relay_Params(relayName)
                    return randomKey
                }
                return null
            }
            catch(e){
                throw Error("Issue in adding write key")
            }
    }
    /**
     * Deletes the write key from the relayName table.
     * Returns true if successful, false otherwise.
     * @param {String} relayName - relay name
     * @param {String} subjectKey - subject key
     */
    function Delete_Subject_Key(relayName,subjectKey){
        return Delete_Table_Entry({subjectKey:subjectKey},`'${relayName}'`)
    }
    /**
     * Retrieves the subjectKey from the relayName database and
     * parses the uploadState field into an object. Returns
     * the subjectKey.
     * @param {String} relayName - relay name
     * @param {String} subjectKey - subject key
     */
    function Get_Subject_Key(relayName,subjectKey){
        return Get_By_Key({subjectKey:subjectKey},`'${relayName}'`,["uploadState"])
    }
    /**
     * Takes in the object of fields and values associated with a writekey and updates 
     * the subjectKey fields with the specified values. Returns true if successful, otherwise
     * an error is thrown.
     * @param {String} relayName - relay name
     * @param {Object} subjectKeyObj - Object of field values to update in the subjectKey
     */
    function Update_Subject_Key(relayName,subjectKeyObj){
        let cloneSubjectKey = JSON.parse(JSON.stringify(subjectKeyObj))
        if (cloneSubjectKey.uploadState){
            cloneSubjectKey.uploadState=JSON.stringify(cloneSubjectKey.uploadState)
        }
        return Update_Table_From_Obj({subjectKey:cloneSubjectKey.subjectKey},cloneSubjectKey,`"${relayName}"`)
    }
    /**
     * Makes and returns random number of length n.
     * @param {Number} n - length of random number to generate
     */
    function Random_Number_N_Digits(n){
        let initial_string=""
        for (var i=0;i<n;i++){
            initial_string+=String(Math.floor(Math.random()*10))
        }
        return initial_string
    }
    /**
     * Modifies the file path on the value object, which is the set of endpoint params,
     * where the parameters subjectKey and pull key give values to substitute in for any
     * path where "subjectKey" or "pullCount" are found. This allows for unique pathing
     * on the upload of each subjectKey to directory locations. 
     * @param {Object} value - value that endpoint maps to
     * @param {String} subjectKey - write key
     * @param {String} keyPull - count associated with key
     */
    async function Create_Custom_Path(value,subjectKey,keyPull){
        try{
            if (! typeof value.customPath === "string"){
                throw Error("Custom paths only accept strings as arguments")
            }
            let splitWritePath=value.customPath.split(/[s][u][b][j][e][c][t][K][e][y]/)
            let rejoinedPath=splitWritePath.join(subjectKey)
            let splitPullPath=rejoinedPath.split(/[p][u][l][l][C][o][u][n][t]/)
            let rejoinedFinal=splitPullPath.join(keyPull)
            if (! (value.customPath==rejoinedFinal)){
                let newBoxId=await Make_Data_Folders(value.boxFolderId,rejoinedFinal,[])
                value.boxFolderId = Object.values(newBoxId.basetree)[0]
            }
            delete value.customPath
            value.boxRelativePath=value.boxRelativePath+rejoinedFinal
        }
        catch(e){
            throw e
        }
    }
    
    /**
     * Retrieves all the write keys associated with the relayName.
     * @param {String} relayName - relay name
     */
    function Get_All_Subject_Keys(relayName){
        try{
            return Retrieve_All_From_Table(relayName,["uploadState"])
        }
        catch(e){
            throw e
        }
    }
    
    module.exports={
        Add_Subject_Key,
        Delete_Subject_Key,
        Add_Subject_Key,
        Update_Subject_Key,
        Get_Subject_Key,
        Get_All_Subject_Keys
    }