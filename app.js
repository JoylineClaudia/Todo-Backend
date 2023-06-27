const express = require('express');
const app = express();

const { mongoose } = require('./db/mongoose');

const bodyParser = require('body-parser');

//Load the mongose models
const { List, Task, User } = require('./db/models');
// const { User } = require('./db/models/user.model');


/** MIDDLEWARE */

//Load Midddleware
app.use(bodyParser.json());

//  CORS HEADERS MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// Verify refresh token
// app.use()
let verifySession = (req, res, next) => {

    // refreshToken from request headers
    let refreshToken = req.header('x-refresh-token');

    // _id from request headers
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user)=> {
        if (!user){
            //user could not be found
            return Promise.reject({
            'error': 'User not found. make sure that user id and refresh token are correct'
        });
        }
        // refresh token exists in database but needs to check weather it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.session.forEach((session) => {
            if (session.token === refreshToken){
                // check if the session has expired
                if(User.hasRefreshTokenExpired(session.expiresAt) === false){
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid){
            // session is valid - call next() to continue processing this web request
            next();
        } else {
            return Promise.reject({
                'error': 'Refresh token has expired or is invalid'
            })
        }
    }).catch((e)=> {
        res.status(401).send(e);
    })
}

  /** END MIDDLEWARE */

/* Route HANDLERS */

/* LIST ROUTES */

/**
 * GET / LISTS
 * Purpose : Get all list
 */
app.get('/lists', (req, res) => {
    //return array list in database
    List.find({}).then((lists) => {
        res.send(lists);
    }).catch((e) => {
        res.send(e);
    });

});

/**
 * POST /lists
 * purpose : create list
 */
app.post('/lists', (req, res) => {
    //create new list
    let title = req.body.title;

    let newList = new List({
        title
    });
    newList.save().then((listDoc) => {
        //full list document returned
        res.send(listDoc);
    });
});

/**
 * PATH /list/:id
 * purpose : update the list
 */
app.patch('/lists', (req, res) => {
    //update the list
    List.findOneAndUpdate({ _id: req.params.id}, {
        $set: req.body
    }).then(()=> {
        res.sendStatus(200);
    });
});

/**
 * DELETE /list/:id
 * Purpose : delete the list
 */
app.delete('/lists/:id', (req, res) => {
    // delete the list
    List.findOneAndRemove({
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc);
    })
});

/**
 * GET /list/:listId/tasks
 */
app.get('/lists/:listId/tasks',(req, res) => {
    // return task having specific listID
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    })
});

// app.get('/lists/:listId/tasks/:taskId', (req, res) => {
//     Task.findOne({
//         _id:req.params.taskId,
//         _list:req.params.listId
//     }).then((task) => {
//         res.send(task);
//     });
// })

/**
 * POST /LIST/:listID
 */
app.post('/lists/:listId/tasks',(req,res) => {
    let newTask = new Task({
        title: req.body.title,
        _listId : req.params.listId
    });
    newTask.save().then((newTaskDoc) => {
        res.send(newTaskDoc);
    })
})

/**
 * PATCH /list/:listID/tasks/:taskID
 */
app.patch('/lists/:listId/tasks/:taskId',(req, res) => {
    Task.findOneAndUpdate({
        _id: req.params.taskId,
        _listId: req.params.listId
    },{
        $set: req.body
        }
    ).then(()=> {
        res.send({message: 'Updated sucessfully'})
    })
});

/**
 * DELETE /Lists/:listID/tasks/:taskID
 * Delete task
 */
app.delete('/lists/:listID/tasks/:taskId', (req, res) => {
    Task.findOneAndRemove({
        _id: req.params.taskId,
        _listID: req.params.listID
    }).then((removedTaskDoc) => {
        res.send(removedTaskDoc);
    })
});


// USER ROUTES
/**
 * POST/users
 * Purpose: Sign Up
 */
app.post('/users', (req, res) => {
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {

        return newUser.generateAccessAuthToken().then((accessToken) => {

            return { accessToken, refreshToken}
        });
    }).then((authTokens) => {
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})

/**
 * POST/ Users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            return user.generateAccessAuthToken().then((accessToken)=> {
                // access token generated successfully
                return {accessToken, refreshToken}
            });
         }).then((authTokens) => {
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
         })
    }).catch((e) => {
        res.status(400).send(e);
    });
})

/**
 * GET /users/me/AccesToken
 * purpose  : generates and returns an access token
 */
app.get('/users/me/access-token', verifySession,(req, res)=> {
    // user is authenticated
    require.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken })
    }).catch((e)=> {
        req.staus(400).send(e);
    });
})

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
