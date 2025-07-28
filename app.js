const express = require('express');
const mysql = require('mysql2');

//******** TODO: Insert code to import 'express-session' *********//


const flash = require('connect-flash');

const app = express();

const session = require('express-session');

// Database connection
const db = mysql.createConnection({
    host: 'c237-all.mysql.database.azure.com',
    port: 3306,
    user: 'c237admin',
    password: 'c2372025!',
    database: 'c237_22_team103'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

//******** TODO: Insert code for Session Middleware below ********//
app.use(session({
    secret:'secret', //session id to be hashed with this secret to prevent changes of session id
    resave: false,
    saveUninitialized: true,
    //session expire after 1 week of inactivity
    cookie:{ maxAge: 1000*60*60*24*7}
}))

app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

//******** TODO: Create a Middleware to check if user is logged in. ********//
const checkAuthenticated =(req, res, next) =>{
    if(req.session.user){
        return next();
    } 
    else {
        req.flash('error','Please log in to view this resource')
        res.redirect('/login');
    }
}
//******** TODO: Create a Middleware to check if user is admin. ********//
const checkAdmin =(req, res, next) =>{
    if(req.session.user.role ==='admin'){
        return next();
    } 
    else {
        req.flash('error','Access denie')
        res.redirect('/dashboard');
    }
}


// Routes
app.get('/index',(req,res)=>{
    const sql ="SELECT * FROM products";
    db.query(sql,(error,results)=>{
        if(error){
            console.error("Database query error:",error.message);
            return res.status(500).send("Error Retrieving users");

        }
        res.render("index",{products: results});
    })
})

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


//******** TODO: Create a middleware function validateRegistration ********//
const validateRegistration = (req,res, next) =>{
    const { username,image,email,password,address,contact,role} =req.body;

    if (!username || !image || !email || !password || !address || !contact || !role ) {
        return res.status(400).send('All fields are required.');
    }
    if (password.length <6){
        req.flash('error','Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register')
    }

    next();
};

//******** TODO: Integrate validateRegistration into the register route. ********//
app.post('/register', validateRegistration, (req, res) => {
    //******** TODO: Update register route to include role. ********//
    const { username,image, email, password, address, contact ,role} = req.body;

    const sql = 'INSERT INTO users (username, image, email, password, address, contact, role) VALUES (?, ?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username,image, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/dashboard');
    });
});



app.get('/addproduct', (req, res)=>{
    res.render('addproduct');
});
app.post('/addproduct', (req, res)=>{
    //Extract product date from the request body
    const {product_name, product_date, image, price, size} = req.body;
    const sql = 'INSERT INTO products (product_name, product_date, image, price, size) VALUES (?,?,?,?,?)';
    db.query( sql, [product_name, product_date, image, price, size],(error,result)=>{
        if (error) {
            console.error("Error adding product:", error);
            res.status(500).send("Error adding product");

        } else{
            res.redirect('/index');
        }
    })
})

//******** TODO: Insert code for login routes to render login page below ********//
app.get('/',(req,res)=>{
    res.render('login',{
        messages: req.flash('success'),
        errors: req.flash('error')
    })
})

//******** TODO: Insert code for login routes for form submission below ********//
app.post('/login',(req,res) =>{
    const {email,password}=req.body;

    //validate email and password
    if (!email || !password){
        req.flash('error', 'All fields are required');
        return res.redirect('/index')
    }

    const sql ='SELECT * FROM users WHERE email =? AND password = SHA1(?)';
    db.query(sql,[email,password],(err,result)=>{
        if(err) {
            throw err;
        }

        if (result.length > 0) {
            //successful login
            req.session.user = result[0];
            req.flash('success','Login successful!');
            if (result[0].role === 'admin') {
                res.redirect('/dashboard')
            }
            else if (result[0].role === 'user') {
                res.redirect('/index')
            }

        }
        else{
            //invalid credentials
            req.flash('error','Invalid  email or password.');
            res.redirect('/');

        }
    })
})
//******** TODO: Insert code for dashboard route to render dashboard page for users. ********//
app.get('/dashboard', checkAuthenticated, checkAdmin,(req, res) => {
    const sql = 'SELECT * FROM users';

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            res.status(500).send('Error fetching users');
        } else {
            res.render('dashboard', { users: result }); // ✅ Pass users to dashboard.ejs
        }
    });
});
//******** TODO: Insert code for admin route to render dashboard page for admin. ********//
app.get('/productdashboard', checkAuthenticated, checkAdmin, (req, res) => {
    db.query('SELECT * FROM products', (err, products) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send('Error fetching products');
        }
        res.render('productdashboard', { user: req.session.user, products: products });
    });
});
//******** TODO: Insert code for logout route ********//
app.get('/logout',(req,res)=>{
    req.session.destroy();
    res.redirect('/');
})

app.get('/deleteuser/:id',(req,res)=>{
    const userid = req.params.id;
    const sql ="DELETE FROM users WHERE id = ?";
    db.query(sql, [userid],(error,results)=>{
        if(error){
            console.error("Error deleting users", error)
            res.status(500).send('Error deleting users')
        }
        else{
            res.redirect('/dashboard');
        }
    })
})

app.get('/deleteproduct/:productID',(req,res)=>{
    const productID = req.params.productID;
    const sql ="DELETE FROM products WHERE productID = ?";
    db.query(sql, [productID],(error,results)=>{
        if(error){
            console.error("Error deleting products", error)
            res.status(500).send('Error deleting products')
        }
        else{
            res.redirect('/index');
        }
    })
})

app.get('/edituser/:id',(req,res)=>{
    const userID=req.params.id;
    const sql ="SELECT * FROM users WHERE id =?";
    db.query( sql,[userID],(error,results)=>{
        if (error) {
            console.error("Database querry error:", error.message);
            return res.status(500).send('Error retrieving user by ID');

        }
        if (results.length >0){
            res.render('edituser',{user: results[0]});

        }
        else{
            res.status(404).send("user not found");
        }
    })
})

app.post('/edituser/:id',(req,res)=>{
    const userID = req.params.id;
    const {username, address, contact, password, email, image, role} = req.body;
    const sql ="UPDATE users SET username = ?,address = ?, contact = ?, password = SHA1(?), email =?, image = ? ,role =? WHERE id=?";
    db.query( sql, [username,address,contact,password,email,image,role,userID], (error,results)=>{
        if (error) {
            console.error("Error updating user:", error);
            res.status(500).send("Error updating user");

        }
        else {
            res.redirect('/dashboard')
        }
    })
});

app.get('/adminregister', (req, res) => {
    res.render('adminregister', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


//******** TODO: Create a middleware function validateRegistration ********//
const validateAdminRegistration = (req,res, next) =>{
    const { username,image,email,password,address,contact,role} =req.body;

    if (!username || !image || !email || !password || !address || !contact || !role ) {
        return res.status(400).send('All fields are required.');
    }
    if (password.length <6){
        req.flash('error','Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/adminregister')
    }

    next();
};

//******** TODO: Integrate validateRegistration into the register route. ********//
app.post('/adminregister', validateAdminRegistration, (req, res) => {
    //******** TODO: Update register route to include role. ********//
    const { username,image, email, password, address, contact ,role} = req.body;

    const sql = 'INSERT INTO users (username, image, email, password, address, contact, role) VALUES (?, ?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username,image, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/dashboard');
    });
});

app.get('/editproduct/:productID',(req,res)=>{
    const productID =req.params.productID;
    const sql ="SELECT * FROM products WHERE productID =?";
    db.query( sql,[productID],(error,results)=>{
        if (error) {
            console.error("Database querry error:", error.message);
            return res.status(500).send('Error retrieving user by ID');

        }
        if (results.length >0){
            res.render('editproduct',{product: results[0]});

        }
        else{
            res.status(404).send("Product not found");
        }
    })
})

app.post('/editproduct/:id',(req,res)=>{
    const productID = req.params.id;
    const {product_name, product_date, price, size, image} = req.body;
    const sql ="UPDATE products SET product_name = ?,product_date = ?, price = ?, size = ? , image = ? WHERE productID = ?";
    db.query( sql, [product_name, product_date, price, size,image, productID], (error,results)=>{
        if (error) {
            console.error("Error updating product:", error);
            res.status(500).send("Error updating product");

        }
        else {
            res.redirect('/productdashboard')
        }
    })
});

app.get('/search', (req, res) => {
    const productName = req.query.productName

    const sql = 'SELECT * FROM products WHERE product_name LIKE ?';

    db.query(sql, [productName], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error searching products');
        }
        res.render('index', { products: results });
    });
});

app.get('/searchuser', (req, res) => {
    const username = req.query.username;

    const sql = 'SELECT * FROM users WHERE username LIKE ?';

    db.query(sql, [username], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error searching products');
        }
        res.render('dashboard', { users: results });
    });
});


app.get('/summary', (req, res) => {
    const summary = {};

    const totalQuery = "SELECT COUNT(*) AS total FROM products";
    db.query(totalQuery, (err, totalResult) => {
        if (err) return res.status(500).send("Total error");

        summary.total = totalResult[0].total;

        const catQuery = "SELECT product_category, COUNT(*) AS count FROM products GROUP BY product_category";
        db.query(catQuery, (err, catResults) => {
            if (err) return res.status(500).send("Category error");

            summary.categories = catResults;

            const avgQuery = "SELECT AVG(price) AS avg_price FROM products";
            db.query(avgQuery, (err, avgResult) => {
                if (err) return res.status(500).send("Avg error");

                summary.avg_price = (avgResult[0].avg_price !== null)
                    ? Number(avgResult[0].avg_price).toFixed(2)
                    : "0.00";

                res.render('summary', { summary });
            });
        });
    });
});

app.get('/searchproductform', (req, res) => {
    res.render('searchproductform'); 
});

app.get('/searchproduct', (req, res) => {
    const { product_name, product_date, price, size } = req.query;

    let sql = "SELECT * FROM products WHERE 1=1";  // '1=1' allows appending AND conditions safely
    const params = [];

    if (product_name) {
        sql += " AND product_name LIKE ?";
        params.push(`%${product_name}%`);
    }

    if (product_date) {
        sql += " AND product_date = ?";
        params.push(product_date);
    }

    if (price) {
        sql += " AND price = ?";
        params.push(price);
    }

    if(size){
        sql += " AND size = ?";
        params.push(size);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal server error");
        }
        res.render("index", { products: results }); // pass data to search.ejs
    });
});


app.listen(3000, () => {
    console.log('Server started on port 3000');
});
