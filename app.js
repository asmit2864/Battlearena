const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 2000;

// middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Connect to MongoDB
mongoose.connect('mongodb+srv://asmit16903:asmit16903@gaming.kft4tbf.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>{
    console.log('Connected to MongoDB')
})
.catch((err)=>{
    console.error('Error connecting to MongoDB');
})

// Homepage route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// LOGIN:

// Define User schema and model
const UserSchema = new mongoose.Schema({
    name:String,
    orgName:String,
    email:String,
    password: String
},
{
    timestamps:true
});

const User = mongoose.model('User', UserSchema);

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard?username=' + user.name);
        } else {
            res.send('Invalid username or password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
    const username = req.query.username;
    res.sendFile(__dirname + '/dashboard.html')
});


// SIGNUP:
// Signup route
app.post('/register', async (req, res) => {
    const {name, orgName, email, password} = req.body;

    try {
        const user = await User.findOne({ email });

        if(!user){
            const hashedPassword = bcrypt.hashSync(password, 10);
            const newUser = new User({name, orgName, email, password: hashedPassword });
            await newUser.save();
            res.redirect('/login.html');
        }
        else{
            res.send("User already exists");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// LOGOUT:
// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});




// PROFILE
// API endpoint to fetch users
app.get('/users', async (req, res) => {
    const email = req.session.user.email;
    const users = await User.findOne({email});
    if(!users){
        res.send("Invalid user session");
    }
    else{
        res.json(users);
    }
});

// UPDATE PROFILE
app.post('/updateProfile', async (req, res) => {
    const {name, orgName, password} = req.body;

    try {
        const email = req.session.user.email;
        const user = await User.findOne({email});
        if(!user){
            res.send("Invalid user session");
        }
        else{
            user.name = name;
            user.orgName = orgName;
            user.password = bcrypt.hashSync(password, 10);
            await user.save();
            res.send("Changes saved successfully")
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



// CREATE TOURNAMENT:

// Define tournament schema and model
const tournamentSchema = new mongoose.Schema({
    tournamentID: String,
    tournamentName: String,
    numberOfTeams: Number,
    participants:Number,
    tDate: Date,
    gameName: String,
    additionalDetails: String
},
{
    timestamps:true
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

app.post('/createTournament', async (req, res) => {
    const {tournamentID, tournamentName, numberOfTeams, tDate,gameName,additionalDetails} = req.body;

    try {
        const tournament = await Tournament.findOne({ tournamentID });

        if(!tournament){
            const newTournament = new Tournament({tournamentID, tournamentName, numberOfTeams,participants:0, tDate,gameName,additionalDetails});
            await newTournament.save();
            res.send("Tournament created");
        }
        else{
            res.send("Tournament already exists, please change the tournament ID");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// fetch tournaments
app.get('/tournaments', async (req, res) => {
    try {
        const tournaments = await Tournament.find();
        res.json(tournaments);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


// CREATE RESULT:

// Define result schema and model
const resultSchema = new mongoose.Schema({
    tournamentID: String,
    tournamentName:String,
    winner:String
},
{
    timestamps:true
});

const Result = mongoose.model('Result', resultSchema);

app.post('/createResult', async (req, res) => {

    const {tournamentID, winner} = req.body;

    try {
        const tournament = await Tournament.findOne({ tournamentID })
        if(!tournament){
            res.send("Tournament doesnt exist, please enter a valid Tournament ID");
        }
        else{
            const tournamentName = tournament.tournamentName;
            const result = await Result.findOne({ tournamentID });

            if(!result){
                const newResult = new Result({tournamentID, tournamentName, winner});
                await newResult.save();
                await Tournament.findByIdAndDelete(tournament._id);

                res.send("Result Declared");
            }
            else{
                res.send("Result already declared, please change the tournament ID");
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// fetch results
app.get('/results', async (req, res) => {
    try {
        const results = await Result.find();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


// CREATE PLAYERS:

// Define result schema and model
const playersSchema = new mongoose.Schema({
    teamName: String,
    playersNames:String,
    email:String,
    tournamentID:String,
    tournamentName:String
},
{
    timestamps:true
});

const Players = mongoose.model('Players', playersSchema);

app.post('/playersRegistration', async (req, res) => {

    const {teamName, playersNames,email,tournamentID} = req.body;

    try {
        const tournament = await Tournament.findOne({ tournamentID })
        if(!tournament){
            res.send("Tournament doesnt exist, please enter a valid Tournament ID");
        }
        else{
            if(tournament.participants == tournament.numberOfTeams){
                res.send("You are late, the tournament is full")
            }
            else{
                const tournamentName = tournament.tournamentName;
                tournament.participants +=1;

                const newPlayers = new Players({teamName, playersNames,email,tournamentID,tournamentName});
                
                await newPlayers.save();
                await tournament.save();
                
                res.send("Registration Successful");
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
