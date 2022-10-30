//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

//add this to include static files.
app.use(express.static("public"));

mongoose.connect(process.env.ATLAS_KEY);


//setup itemsSchema for list items and add default items.
const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

//create list schema for custom lists.
const listSchema = new mongoose.Schema ({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("list", listSchema);

const defaultItems = [item1, item2, item3];

app.get("/", function(req, res) {

//if there are no items in a list, add default items and render, otherwise render a list with found items.
  Item.find({}, function(err, foundItems){
    if(err) {
      console.log(err);
    } else if (foundItems.length === 0) {

      Item.insertMany(defaultItems, function(err){
        if (err) {
          console.log(err);
        } else {
          console.log("Default items successfully added to the collection.");
        }
      });
      res.redirect("/");
    }else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});
    }
  });

});


//create a custom list with users' input in the url. If list doesn't exist, create a new one and render accordingly.
app.get("/:customListName", function(req,res) {

  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, function(err, foundList){
    if(!err) {
      if (!foundList){
        //Create a new list
        const list = new List ({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //show an existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items})
      }
    }
  });
});

//add new items to the list. Check if its the default or custom list and add and redirect accordingly.
app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if(listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName)
    });
  }
  });


//delete checked items from default or custom lists.
app.post("/delete", function(req,res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
      if(!err){
        console.log("Item successfully deleted.");
        res.redirect("/");
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }

});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully.");
});
