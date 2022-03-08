/**
 * @module SQL/SQL_Functions
 */
var Database = require('better-sqlite3')
var fs =require("fs")
const db = new Database(`${__dirname}/SQL_DB/ExiusPermissions.db`, { verbose: console.log });
/**
 * Takes an object with a single key and value, and uses that to search the database and make changes
 * associated with updatedParams. The columns specified by atomicColumns will,
 * even if strings, not be stored as strings. If successful true is returned.
 * @param {Object} searchKey - key type mapping to a unique value to search on
 * @param {Object} updatedParams - key value mapping to store in the database
 * @param {String} tableName - table name to search for
 * @param {Array<String>} atomicColumns - column names to not convert to string
*/
function Update_Table_From_Obj(searchKey,updatedParams,tableName,atomicColumns=[]){
    try{
        let newFields = ""
        for (const [key,value] of Object.entries(updatedParams)){
            if (typeof value =="string" && !atomicColumns.includes(key)){
                newFields+=`${key}='${value}',`
            }
            else{
                newFields+=`${key}=${value},`
            }
        }
        newFields=newFields.substring(0,newFields.length-1)
        db.exec(`UPDATE ${tableName} SET ${newFields} WHERE ${Object.keys(searchKey)[0]} = '${searchKey[Object.keys(searchKey)[0]]}'`)
        return true
    }
    catch(e){
        throw Error("Issue in updating key")
    }
}
/**
 * Takes in a unique key value pair to search on inside of a tableName,
 * if the key exists, it gets deleted. If deleted, returns true.
 * @param {Object} searchKey - unique key value pair to search for
 * @param {String} tableName - tableName to search under
 */
function Delete_Table_Entry(searchKey,tableName){
    try{
        if (!searchKey){
            throw Error("Issue in deleting table entry, no searchKey passed")
        }
        db.exec(`DELETE FROM ${tableName} WHERE ${Object.keys(searchKey)[0]}='${searchKey[Object.keys(searchKey)[0]]}';`)
        return true
    }
    catch(e){
        console.log(e)
        throw Error("Issue in deleting table entry")
    }
}
/**
 * Wipes all data from the table. Returns true if successful
 * @param {String} tableName - table name
 */
function Clear_Table(tableName){
    try{
        db.exec(`DELETE FROM ${tableName}`)
        return true
    }
    catch(e){
        return false
    }
}
/**
 * Deletes table. Returns true if successful
 * @param {String} tableName - table name
 */
function Delete_Table(tableName){
    try{
        try{
            db.exec(`DROP TABLE '${tableName}'`)
        }
        catch{
            db.exec(`DROP TABLE ${tableName}`)
        }
        return true
    }
    catch(e){
        throw Error("Issue in deleting table")
    }
}
/** 
 * Gets all table names in connected database. Returns an array of strings.
 */
function Get_Table_Names(){
    return db.prepare("SELECT (name) FROM sqlite_master where type='table'").all()
}
/**
 * Checks if the table exists in the connected database
 * @param {String} tableName - name of table
 */
function Does_Table_Exist(tableName){
    if (db.prepare(`SELECT (name) FROM sqlite_master where (type='table'AND name='${tableName}')`).get()){
        return true
    }
    return false
}
/**
 * Gets the fields of a table with their storage type. Returns a nexted
 * object with schema mapping to the field type pairs and primaryKeys mapping
 * to the primary keys as an array.
 * @param {String} tableName - table name
 */
function Get_Table_Schema(tableName){
    let tableSchema={}
    let primaryKeys=[]
    var tableInformation = db.prepare(`SELECT (sql) FROM sqlite_master WHERE (type='table' AND name='${tableName}')`).get()
    let newInformation=tableInformation.split(/[/(/)]/)[1].split(",")
    newInformation.map((fieldInfo)=>{
        let newField=fieldInfo.trim()
        let keyParts=newField.split(" ")
        tableSchema[keyParts[0]]=keyParts[1]
        if(keyParts.length>2){
            primaryKeys.push(keyParts[0])
        }
    })
    return {schema:tableSchema,primaryKeys:primaryKeys}

}
/**
 * Creates an sqlite3 table based on the name given by tableName,
 * primary keys given by primaryKeys, and field type paris given by 
 * the schema object.
 * @param {String} tableName - table name to create
 * @param {Array<String>} primaryKeys - fields to make primary
 * @param {Object} schema - mapping of field type pairs
 */
function Create_Table(tableName,primaryKeys,schema){
    let sqlString=""
    let primaryString=""
    for (const [key, value] of Object.entries(schema)){
        sqlString+=`${key} ${value},`
    }

    for (var i=0;i<primaryKeys.length;i++){
        if (i==primaryKeys.length-1){
            primaryString+=`${primaryKeys[i]}`
        }
        else{
            primaryString+=`${primaryKeys[i]},`
        }
    }
    db.prepare(`CREATE TABLE IF NOT EXISTS ${tableName} (${sqlString} PRIMARY KEY (${primaryString}))`).run()
}
/**
 * Gets all entries from a table. If a field is given in 
 * parseColumns, it will be parsed into a javascript object when 
 * it is retrieved. 
 * @param {String} tableName - table name
 * @param {Array<String>} parseFields - fields to parse into js objects on retrieval
 */
function Retrieve_All_From_Table(tableName, parseFields=[]){
    let retrieve = db.prepare(`SELECT * FROM ${tableName}`).all()
    if (parseFields.length>0){
        retrieve=retrieve.map((item)=>{
            for (var i=0;i<parseFields.length;i++){
                item[parseColumns[i]]=JSON.parse(item[parseColumns[i]])
            }
            return item
        })
    }
    return retrieve
}
/**
 * Inserts an object into the database where all entries are mapped to their respective keys.
 * if an object entry is not a string or a number, it gets JSON.stringify run on it before being
 * entered into the database.
 * @param {Object} obj - object of field value pairs to enter into the db
 * @param {String} tableName - table name
 */
function Insert_Object_Into_Table(obj,tableName){
    try{
        keyStringColumns=''
        keyStringValues=''
        for (var keys of Object.keys(obj)){
            keyStringColumns += `${keys},`
            keyStringValues += `@${keys},`
        }
        keyStringColumns=keyStringColumns.substring(0,keyStringColumns.length-1)
        keyStringValues=keyStringValues.substring(0,keyStringValues.length-1)
        for (const[key,value] of Object.entries(obj)){
            if (!(typeof value === "number") && !(typeof value === "string")){
                obj[key]=JSON.stringify(value)
            }
        }
        db.prepare(`INSERT INTO ${tableName} (${keyStringColumns}) VALUES (${keyStringValues})`).run(obj)
        return true
    }
    catch(e){
        throw Error("Issue in inserting object to table")
    }
}
/**
 * Retrieves an entry from the table by key name in the form of an object mapping
 * between key value pairs. If a field is in parseFields, the field value 
 * will be parsed with JSON.parse before being returned.
 * @param {Object} key - keyname value pair to search for
 * @param {String} tableName - table name
 * @param {Array<String>} parseFields - fields to run JSON.parse on before returning.
 */
function Get_By_Key(key,tableName,parseFields=[]){
    let keyInfo = db.prepare(`SELECT * FROM ${tableName} WHERE ${Object.keys(key)[0]} = @${Object.keys(key)[0]}`).get(key)
    if (keyInfo){
        Object.keys(keyInfo).map((field)=>{
            if (parseFields.includes(field)){
                keyInfo[field]=JSON.parse(keyInfo[field])
            }
        })
    }
    return keyInfo
}
/**
 * Makes a backup of the database with the current date
 * at ./SQL_Store. No return.
 */
function Backup_DB(){
    db.backup(`./SQL_Store/ExiusPermissions-${Date.now()}.db`)
}
/**
 * Restores the database from a backup file given at the path backupFilePath. If 
 * there is a current file there, it gets replaced with the backup. The old version is 
 * stored as ExiusPermissions-old.db. If successful, true is returned
 * @param {String} backupFilePath - file path to db to backup
 */
function Restore_From_Backup(backupFilePath){
    try{
        if (fs.existsSync("./SQL_Store/ExiusPermissions.db")){
            fs.promises.copyFile("./SQL_Store/ExiusPermissions.db","./SQL_Store/ExiusPermissions-old.db")
        }
        fs.promises.copyFile(backupFilePath,"./SQL_Store/ExiusPermissions.db")
        return true
    }
    catch(e){
        throw Error("Error in restoring backup")
    }
}

function* To_Rows(stmt) {
    //helper iterator for Write_Table_To_CSV
  yield stmt.columns().map(column => column.name);
  yield* stmt.raw().iterate();
}

/**
 * Takes table and makes a csv file out of it and builds it
 * at the file path given by filePath.
 * @param {String} filePath - file path 
 * @param {String} tableName - table name
 */
function Write_Table_To_CSV(filePath,tableName) {
    let stmt = db.prepare(`SELECT * FROM ${tableName}`)
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    for (const row of To_Rows(stmt)) {
      stream.write(row.join(',') + '\n');
    }
    stream.on('error', reject);
    stream.end(resolve);
  });
}
/**
 * Deletes all tables and all their information from the db.
 * no return.
 */
function Delete_All(){
    let names = Get_Table_Names()
    for (var i=0;i<names.length;i++){
        names.map((info)=>{console.log(Get_Table_Names());
            Delete_Table(info.name)})
    }
}

module.exports={
Does_Table_Exist,
Clear_Table,
Delete_Table,
Get_Table_Names,
Get_Table_Schema,
Create_Table,
Delete_Table_Entry,
Update_Table_From_Obj,
Retrieve_All_From_Table,
Insert_Object_Into_Table,
Get_By_Key,
Backup_DB,
Restore_From_Backup,
Write_Table_To_CSV,
Delete_All
}