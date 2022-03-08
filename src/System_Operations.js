var express = require('express');
const cors = require('cors')
/**
 * @namespace API
 */
var app = express();
app.use(cors())
app.use(express.urlencoded({ extended: true}));
var {File_Upload} = require("./File_Upload/Upload_Files")
var {Relay_App} = require("./Relay/Relay_Router")
var {Subject_Key_Router} = require("./Subject_Key/Subject_Key_Router")
var {Make_Relay_Table} = require("./Relay/Relay_Base")
var {Make_Experiment_Repo} = require("./Github/Repo_Router")
const port = 3050
app.use("/Upload",File_Upload)
app.use("/Relay",Relay_App)
app.use("/SubjectKey",Subject_Key_Router)
app.use("/Github",Make_Experiment_Repo)
app.listen(port, () => console.log(`Upload Files listening on port ${port}!`));
try{
    Make_Relay_Table()
}
catch(e){
    console.log("template_table_already_exists")
}