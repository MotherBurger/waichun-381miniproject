var assert = require('assert');
var bodyparser = require('body-parser');
var express = require('express');
var fs = require('fs');
var fileupload = require('express-fileupload');
var mongoclient = require('mongodb').MongoClient;
var objectid = require('mongodb').ObjectID;
var session = require('cookie-session');
var url = require('url');

var mongourl = "mongodb://admin:admin@ds119446.mlab.com:19446/waichun-381miniproject"
var portno = 38100;
var serverport = process.env.PORT || portno;
var SECRETKEY = 'COMPS381FProject';

var app = express();

app.set('view engine', 'ejs');

app.use(session({
  name: 'session',
  keys: ['waichun-381miniproject'],
  maxAge: 24 * 3600 * 1000 // 24 hours
}));
app.use('/css', express.static('css'));
app.use(function(req,res,next){
  res.locals.session = req.session;
  next();
});
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: false}));
app.use(express.static('public'));
app.use(fileupload({
  limits: {
    fileSize: 5 * 1024 * 1024
  },
}));

app.listen(serverport, function(){
  console.log('Server listening on port ' + portno);
});

//============================GET ZONE===================================


app.get('/',function(req,res) {
  if (req.session.id) {
    res.redirect("read");
  } else {
    res.status(200).render("login");
    console.log(req.method + " " + req.path);
  }
});

app.get('/index',function(req,res) {
	res.redirect("read");
  console.log(req.method + " " + req.path);
});

app.get('/home',function(req,res) {
	res.redirect("read");
  console.log(req.method + " " + req.path);
});

app.get('/register',function(req,res) {
	res.status(200).render("register");
  console.log(req.method + " " + req.path);
});

app.get('/logout', function(req,res){
  console.log(req.method + " " + req.path);
  console.log(req.session.id + " logged out.");
  req.session = null;
  returnRender (res, 200, 'template', 'Logged Out', 'Logged out successfully!', '');
});

app.get('/read', function(req,res){
  console.log(req.method + " " + req.path);
  var criteria = url.parse(req.url, true).query;
  console.log("Criteria: " + JSON.stringify(criteria));
  checkLogin (req,res, function(){
    mongoclient.connect(mongourl, function (err, db){
      if (err) throw err;
      assert.equal(null, err);
      console.log('Connected to MongoDB for reading restaurants.');
      findRestaurants(db,criteria,function(restaurants) {
        db.close();
        console.log("Disconnected to MongoDB for reading restaurants.");
        res.status(200).render("read", {
          r: restaurants,
          id: req.session.id,
          criteria: JSON.stringify(criteria)
        });
        return(restaurants);
      });
    });
  });
});

app.get('/create', function(req,res){
  checkLogin(req,res,function(){
    console.log(req.method + " " + req.path);
    res.status(200).render("restaurant", {
      type: 'create',
      restaurant: {
        name: '',
        borough: '',
        cuisine: '',
        address: {
          street: '',
          building: '',
          zipcode: '',
          coord: {
            lat: '',
            lon: ''
          }
        },
        photo: {},
      }
    });
  });
});

app.get('/edit/:id', function(req,res){
  checkLogin(req,res,function(){
    console.log(req.method + " " + req.path);
    mongoclient.connect(mongourl, function (err, db){
      assert.equal(null, err);
      console.log('Connected to MongoDB for editing ' + req.params.id);
      db.collection('restaurants').find({_id: new objectid(req.params.id)}).toArray(function (err, data){
        try {
          if (err){
              throw 'Restaurant ID not found.';
          } else if (data[0].owner == req.session.id || req.session.id == 'admin'){
            db.close();
            console.log('Disconnected to MongoDB for editing ' + req.params.id);
            res.status(200).render("restaurant", {
              type: 'edit',
              r: data[0]
            });
          } else {
            throw 'You are not the owner. Editing is not permitted.';
          }
        } catch (err) {
          db.close();
          console.log('Disconnected to MongoDB for editing ' + req.params.id);
          returnRender (res, 500, 'template', 'Error', err, 'read');
        }
      });
    });
  });
});

app.get('/display/:id', function(req,res){
  checkLogin(req,res,function(){
    console.log(req.method + " " + req.path);
    mongoclient.connect(mongourl, function (err, db){
      assert.equal(null, err);
      console.log('Connected to MongoDB for displaying ' + req.params.id);
      db.collection('restaurants').find({_id: new objectid(req.params.id)}).count().then(function (count){
        try {
          if (count < 0){
            throw 'Restaurant ID not found.'
          } else {
            db.collection('restaurants').find({_id: new objectid(req.params.id)}).toArray(function (err, data){
              res.status(200).render('display', {
                r: data[0]
              });
            });
            db.close();
            console.log('Disconnected to MongoDB for displaying ' + req.params.id);
          }
        } catch (err) {
          db.close();
          console.log('Disconnected to MongoDB for displaying ' + req.params.id);
          returnRender (res, 500, 'template', 'Error', err, 'read');
        }
      });
    });
  });
});

app.get('/delete/:id', function(req,res) {
  checkLogin(req,res,function(){
    console.log(req.method + " " + req.path);
    mongoclient.connect(mongourl, function (err, db){
      assert.equal(null, err);
      console.log('Connected to MongoDB for pre-delete checking ' + req.params.id);
      db.collection('restaurants').find({_id: new objectid(req.params.id)}).toArray(function (err, data){
        try {
          if (err){
            throw 'Restaurant ID not found.';
          } else if (data[0].owner == req.session.id || req.session.id == 'admin'){
            db.close();
            console.log('Disconnected to MongoDB for pre-delete checking ' + req.params.id);
            res.status(200).render("deletecheck", {
              rname: data[0].name,
              rid: data[0]._id
            });
          } else {
            throw 'You are not the owner. Deleting is not permitted.';
          }
        } catch (err) {
          db.close();
          console.log('Disconnected to MongoDB for pre-delete checking ' + req.params.id);
          returnRender (res, 500, 'template', 'Error', err, 'read');
        }
      });
    });
  });
});

app.get('/todelete/:id', function(req,res) {
  checkLogin(req,res,function(){
    console.log(req.method + " " + req.path);
    mongoclient.connect(mongourl, function (err, db){
      assert.equal(null, err);
      console.log('Connected to MongoDB for deleting ' + req.params.id);
      db.collection('restaurants').find({_id: new objectid(req.params.id)}).toArray(function (err, data){
        var rname = data[0].name;
        try {
          if (err){
            throw 'Restaurant ID not found.';
          } else if (data[0].owner == req.session.id || req.session.id == 'admin'){
            if (data[0].photo.name){
              var filepath = __dirname + '/public/images/' + data[0].name + '.' + data[0].photo.mimetype.replace('image/', '');
              fs.unlink(filepath, function(error){
                if (error){
                  returnRender (res, 500, 'template', 'Error', err, 'read');
                } else {
                  console.log('Photo deleted: ' + filepath);
                }
              });
            }
            db.collection('restaurants').remove({_id: new objectid(req.params.id)});
            db.close();
            console.log('Disconnected to MongoDB for deleting ' + req.params.id);
            var msg = rname + ' deleted successfully!'
            returnRender (res, 200, 'template', 'Delete Successfully', msg, 'read');
          } else {
            throw 'You are not the owner. Deleting is not permitted.';
          }
        } catch (err) {
          db.close();
          console.log('Disconnected to MongoDB for deleting ' + req.params.id);
          returnRender (res, 500, 'template', 'Error', err, 'read');
        }
      });
    });
  });
});

app.get('/toedit/:id', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/toedit', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/torate/:id', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/torate', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/toreg', function(req,res){
  post2Get(req,res);
});

app.get('/tologin', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/tocreate', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/torate', function(req,res){
  checkLogin(req,res,function(){
    post2Get(req,res);
  });
});

app.get('/delete', function(req,res){
  checkLogin(req,res,function(){
    idMissing(req,res);
  });
});

app.get('/todelete', function(req,res){
  checkLogin(req,res,function(){
    idMissing(req,res);
  });
});

app.get('/display', function(req,res){
  checkLogin(req,res,function(){
    idMissing(req,res);
  });
});

app.get('/edit', function(req,res){
  checkLogin(req,res,function(){
    idMissing(req,res);
  });
});


//===========================POST ZONE===================================

app.post('/toreg', function(req,res){
  console.log(req.method + " " + req.path);
  try {
    if (req.body.pw1 != req.body.pw2){
      //Check if the password are the same
      console.log("Password does not match.");
      throw 'Password does not match. Register Aborted.';
    } else {
      mongoclient.connect(mongourl, function (err, db){
        if (err) throw err;
        assert.equal(null, err);
        console.log('Connected to MongoDB for account creation.');
        db.collection('users').count({ username: req.body.id }, function(error, num){
          console.log('Count of ' + req.body.id + ": " + num);
          if (num > 0){
            console.log("Username taken: " + req.body.id + ".")
            err = 'The username has been taken. Please use another username.';
            returnRender (res, 500, 'template', 'Error', err, 'register');
            db.close();
            console.log("Disconnected to MongoDB for Account Creation.");
          } else {
            var user = {
              username: req.body.id,
              password: req.body.pw1
            };
            db.collection('users').insertOne(user);
            console.log("Account Created for " + req.body.id + ".");
            returnRender (res, 200, 'template', 'Account Created', 'Account Created!', '');
            db.close();
            console.log("Disconnected to MongoDB for Account Creation.");
          }
        });
      });
    }
  } catch (err) {
    returnRender (res, 500, 'template', 'Error', err, 'register');
  }
});

app.post('/tologin', function(req,res){
  console.log(req.method + " " + req.path);
  mongoclient.connect(mongourl, function (err, db){
    if (err) throw err;
    assert.equal(null, err);
    console.log('Connected to MongoDB for logging in.');
    db.collection('users').find({ username: req.body.id }).limit(1).toArray(function (err, loginResult){
      try {
        if (loginResult == 0) {
          console.log("User not found: " + req.body.id);
          throw 'Username not found.';
        } else if (loginResult[0].password != req.body.pw) {
          console.log(req.body.id + " attempted to login. Incorrect password.");
          throw 'Incorrect password.';
        } else {
          req.session.id = req.body.id;
          console.log(req.body.id + " logged in.")
          res.redirect('/read');
        }
      } catch (err) {
        returnRender (res, 500, 'template', 'Error', err, '');
      }
    });
    db.close();
    console.log("Disconnected to MongoDB for logging in.");
  });
});

app.post('/tocreate', function(req,res,rej){
  console.log(req.method + " " + req.path);
  mongoclient.connect(mongourl, function (err, db){
    try {
      if (err) throw err;
      assert.equal(null, err);
      console.log('Connected to MongoDB for creating restaurant.');
      var form = getForm(res, req);
      form['photo'] = getPhoto (res, req);
      db.collection('restaurants').find({},{_id:0, restaurant_id:1}).limit(1).sort({restaurant_id:-1}).toArray(function (err, max){
        try{
          if (err) {
            throw err;
          } else {
            form['restaurant_id'] = parseInt(max[0].restaurant_id) + 1;
            db.collection('restaurants').insert(form);
            db.close();
            console.log("Disconnected to MongoDB for creating restaurant.");
            returnRender (res, 200, 'template', 'Added Successfully', 'Restaurant added successfully!', 'read');
          }
        } catch (err) {
          db.close();
          console.log("Disconnected to MongoDB for creating restaurant.");
          returnRender (res, 500, 'template', 'Error', err, 'create');
        }
      });
    } catch (err) {
      returnRender (res, 500, 'template', 'Error', err, 'create');
    }
  });
});

app.post('/toedit/:id', function(req,res){
  console.log(req.method + " " + req.path);
  mongoclient.connect(mongourl, function (err, db){
    try {
      if (err) throw err;
      assert.equal(null, err);
      console.log('Connected to MongoDB for updating ' + req.params.id);
      var query = {_id: new objectid(req.params.id)};
      var form = getForm(res, req);
      db.collection('restaurants').find(query).limit(1).toArray(function (err, result) {
        try {
          if (result == 0) {
            console.log("Restaurant not found: " + req.body.id);
            throw 'Restaurant not found.';
          } else {
            form['grades'] = result[0].grades;
            var photo = getPhoto (res, req);
            if (req.session.id == 'admin'){
              form['owner'] = result[0].owner;
            }
            if (!photo.name) {
              form['photo'] = result[0].photo;
            } else {
              form['photo'] = photo;
            }
            db.collection('restaurants').update(query,form);
            //console.log("Form sent for updating: " + JSON.stringify(form));
            db.close();
            console.log('Disconnected to MongoDB for updating ' + req.params.id);
          }
        } catch (err) {
          returnRender (res, 500, 'template', 'Error', err, '');
        }
      });
    } catch (err) {
      returnRender (res, 500, 'template', 'Error', err, 'create');
    }
  });
  returnRender (res, 200, 'template', 'Updated Successfully', 'Restaurant updated successfully!', 'display/' + req.params.id);
});

app.post('/torate/:id', function(req,res) {
  console.log(req.method + " " + req.path);
  const id = req.params.id;
  var user = req.body.user;
  var score = req.body.score;
  var query = {_id: new objectid(id)};
  var rated = false;
  if (id == undefined){
    var err = 'Missing ID!'
    returnRender (res, 500, 'template', 'Error', err, 'display/' + id);
  } else {
    mongoclient.connect(mongourl, function (err, db){
      try{
        if (err) throw err;
        assert.equal(null, err);
        console.log('Connected to MongoDB for rating ' + id);
        new Promise(function (resolve, rej){
          db.collection('restaurants').find(query).limit(1).toArray(function (err, data) {
            resolve(data)
          });
        }).then(function (data) {
          return data[0].grades.map(function (score) {
            if (score.user == user) {
              rated = true;
              console.log(user + ' attempted to rate for ' + id + ' again!')
            }
          });
        }).then(function (data) {
          if (!rated) {
            var form = { $push: { grades: { user: user, score: score } } }
            return db.collection('restaurants').update(query,form).then(function () {
              db.close();
              console.log('Disconnected to MongoDB for rating ' + id);
              returnRender (res, 200, 'template', 'Rated Successfully', 'Restaurant rated successfully!', 'display/' + id);
            });
          } else {
            db.close();
            console.log('Disconnected to MongoDB for rating ' + id);
            var err = 'You have rated for this restaurant.';
            returnRender (res, 500, 'template', 'Error', err, 'display/' + id);
          }
        });
      } catch (err) {
        returnRender (res, 500, 'template', 'Error', err, 'display/' + id);
      }
    });
  }
});

app.post('/search', function(req,res) {
  console.log(req.method + " " + req.path);
  var query = req.body.title + "=" + req.body.value;
  console.log(query);
  res.status(200).redirect('/read?' + query);
});

//========================RESTful ZONE===================================

app.post('/api/restaurant/create', function (req,res){
  console.log(req.method + " " + req.path + " " + JSON.stringify(req.body));
  var result = {};
  var form = getFormAPI(res, req);
  mongoclient.connect(mongourl, function (err, db){
    try {
      if (err) throw err;
      assert.equal(null, err);
      console.log('Connected to MongoDB for creating restaurant API.');
      db.collection('restaurants').find({},{_id:0, restaurant_id:1}).limit(1).sort({restaurant_id:-1}).toArray(function (err, max){
        try{
          if (err) {
            throw err;
          } else {
            var newrid = parseInt(max[0].restaurant_id) + 1
            form['restaurant_id'] = newrid;
            db.collection('restaurants').insert(form);
            db.collection('restaurants').find({restaurant_id:newrid},{restaurant_id:1}).limit(1).toArray(function (err, newid){
              result["_id"] = newid[0]._id;
              db.close();
              console.log("Disconnected to MongoDB for creating restaurant API.");
              result["status"] = "ok";
              console.log(JSON.stringify(result));
              res.status(200).end(JSON.stringify(result));
            });
          }
        } catch (err) {
          result["status"] = "failed";
          console.log(JSON.stringify(result));
          res.status(500).end(JSON.stringify(result));
        }
      });
    } catch (err) {
      result["status"] = "failed";
      console.log(JSON.stringify(result));
      res.status(500).end(JSON.stringify(result));
    }
  });
});

app.get('/api/restaurant/create', function (req,res){
  console.log(req.method + " " + req.path);
  var err = "You shouldn\'t be here! POST request only for this API URL."
  console.log("Error (API): GET request received for " + req.path + " instead of POST.")
  res.status(500).end("Error : " + err);
});

app.get('/api/restaurant/read', function (req,res){
  console.log(req.method + " " + req.path);
  var err = "Please include the searching criteria in the URL. \nFormat: \"/api/restaurant/read/\'TITLE\'/\'VALUE\'\"";
  console.log("Error (API): Empty GET request received.")
  res.status(500).end("Error : " + err);
});

app.get('/api/restaurant/read/:title/:value', function (req,res){
  var title = req.params.title;
  var value = req.params.value;
  var supported = ['name', 'borough', 'cuisine'];
  var criteria = {
    [title]: value
  }
  console.log(req.method + " " + req.path + " " + JSON.stringify(criteria));
  if (supported.indexOf(title) < 0) {
    var err = "Searching on " + title + " is not supported. \nCurrently support \'name\', \'borough\', \'cuisine\' searching only"
    console.log('Error (API): ' + err);
    res.status(400).end('Error : ' + err);
  } else {
    mongoclient.connect(mongourl, function (err, db){
      try{
        if (err) throw err;
        assert.equal(null, err);
        console.log('Connected to MongoDB for reading restaurants in API.');
        findRestaurants(db,criteria,function(restaurants) {
          db.close();
          console.log("Disconnected to MongoDB for reading restaurants in API.");
          res.status(200).end(JSON.stringify(restaurants));
        });
      } catch (err) {
        console.log('Error (API): ' + err);
        res.status(500).end('Error : ' + err);
      }
    });
  }
});

//=======================FUNCTION ZONE===================================

function findRestaurants(db,criteria,callback) {
	var restaurants = [];
	cursor = db.collection('restaurants').find(criteria).sort({restaurant_id : 1});
	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants);
		}
	});
}

function checkLogin (req, res, callback) {
  try {
    if (req.session.id == null){
      //Not logged in
      console.log("User arrived " + req.path + " without logging in");
      throw 'Please login.';
    } else {
      callback();
    }
  } catch (err) {
    returnRender (res, 500, 'template', 'Error', err, '');
  }
}

function post2Get(req,res) {
  console.log(req.method + " " + req.path);
  var err = 'You should submit a POST form to here. GET request received.';
  if (req.params.id){
    returnRender (res, 500, 'template', 'Error', err, 'display/' + req.params.id);
  } else {
    returnRender (res, 500, 'template', 'Error', err, 'home');
  }
}

function idMissing(req,res) {
  console.log(req.method + " " + req.path);
  var err = 'ID is missing.';
  returnRender (res, 500, 'template', 'Error', err, 'read');
}

function returnRender (res, status, ejs, title, content, link){
  res.status(status).render(ejs, {
    title: title,
    content: content,
    link: link
  });
  console.log(title + " : " + content);
}

function getFormAPI (res, req){
  var name = req.body.name;
  var borough = req.body.borough;
  var cuisine = req.body.cuisine;
  var street = '';
  var building = '';
  var zipcode = '';
  var lat = '';
  var lon = '';
  var owner = 'API Creation';
  var photo = {};
  var grades = [];

  assert.notEqual(name, undefined, 'Name not defined');
  assert.notEqual(owner, undefined, 'Owner not defined');

  if (req.body.address) {
    street = req.body.address.street;
    building = req.body.address.building;
    zipcode = req.body.address.zipcode;
    lat = req.body.address.lat;
    lon = req.body.address.lon;
  }

  var restaurant2upload = {
    name: name,
    borough: borough,
    cuisine: cuisine,
    address: {
      street: street,
      building: building,
      zipcode: zipcode,
      coord: {
        lat: lat,
        lon: lon
      }
    },
    owner: owner,
    lastupdate: new Date(),
    grades: grades,
    photo: photo
  }
  return restaurant2upload;
}

function getForm (res, req){
  var name = req.body.name;
  var borough = req.body.borough;
  var cuisine = req.body.cuisine;
  var street = req.body.street;
  var building = req.body.building;
  var zipcode = req.body.zipcode;
  var lat = req.body.lat;
  var lon = req.body.lon;
  var owner = req.session.id;
  var restaurant_id = req.body.restaurant_id;
  var grades = [];

  assert.notEqual(name, undefined, 'Name not defined');
  assert.notEqual(owner, undefined, 'Owner not defined');

  var restaurant2upload = {
    name: name,
    borough: borough,
    cuisine: cuisine,
    address: {
      street: street,
      building: building,
      zipcode: zipcode,
      coord: {
        lat: lat,
        lon: lon
      }
    },
    owner: owner,
    lastupdate: new Date(),
    restaurant_id: parseInt(restaurant_id),
    grades: grades
  }
  return restaurant2upload;
}

function getPhoto (res, req){
  var photo = {};
  if (req.files && req.files.photo){
    photo = req.files.photo;
    var filename = photo.name;
    var mimetype = photo.mimetype;
    var uploadPath = __dirname + '/public/images/' + req.body.name + '.' + mimetype.replace('image/', '')
    photo.mv(uploadPath, function(err){
      if (err)
        return returnRender (res, 500, 'template', 'Error', err, 'restaurant');
    });
    photo['uploadPath'] = uploadPath;
  }
  return photo;
}
