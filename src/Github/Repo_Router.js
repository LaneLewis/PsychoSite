const express = require("express")
var router = express.Router()
var {makeNewExperimentRepo} = require("./Add_Repo")
var {Is_User_In_Org} = require("./Github_Authorization")
router.post("/addRepository", async function(req, res){
    try{
        auth = req.headers.authorization.split(";")
        if (auth.length != 2){
            throw Error("Invalid Length")
        }
        if (await Is_User_In_Org(auth[1])){
            if (await makeNewExperimentRepo({org:"NRD-Lab",name:auth[0]})){
                res.status(200).send("Success")
            }
            else{
                res.status(200).send("Repository Already Exists")
            }
        }
        else{
            res.status(401).send("")
        }
    }
    catch(e){
        res.status(404).send("")
    }
})

module.exports = {Make_Experiment_Repo:router}