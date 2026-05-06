Project Description: Wabanimals, a Wellesley animal sighting social media platform. Users can post animals that they’ve seen around campus and look at what other users have posted, as well as interact with this content through liking and commenting. 
Group Members: Ari, Suzy, Nivale

Account: wabanimals
Directory: beta

WHAT IS NEW in beta version:
-commenting on posts
-admin account privileges (deleting posts, deleting users, making accounts admin status/removing admin status)
-fixes to photo upload and photo updating (all photos should appear properly)
-profile page is complete (counters for how many posts and comments a user has made, overview of all posts and all species sighted)
-data overview bar on home page

TESTING NEW BETA FUNCTIONALITIES:

Testing admin privileges:
-login with username ari, password ai106 (this is an account that we have set up as an admin)
-Click on "Admin" in navbar (this should ONLY appear because you are an admin, and not on "regular" accounts)
-Look at the actions you can perform as an admin
-Delete any user that you want
-Make any user that you want an admin. Then, remove that user's admin status
-Go to the home page and scroll through the posts, you should have the ability to delete ALL POSTS
-Delete any post of your choosing
-After this feel free to log out and log back in as yourself, this was just for admin privileges. "scott" is not an admin.

Testing commenting:
-Go to your profile. Observe what the counter on your # of comments currently is.
-Go to home page, and find a post that you like. You should see an empty box that says "Write a comment"
-Comment "I like this animal!" in this box, or write anything else  as you see fit. 
-Click the "Post" button and make sure your comment appears in the comment feed under your correct username
that you are logged in under
-Go to your profile. Your comment counter should be 1 higher, since you have added 1 additional comment.

Everything below is the same testing scripts as in beta, but previous bugs from alpha are fixed, and additional URLs to test are added :

URLs to Test: 
/ (redirects to register page)
/register 
/login (not on nav)
/home  (home page with feed, on nav bar)
/logout on the nav bar
/search (search by species and location)
/upload (takes you to post upload form)
/profile (tells you how many posts you’ve uploaded when logged in, how many comments, what species you have seen, etc.) **new
/about (about the project)
/admin (admin dashboard for user "ari") **new

Sample usernames and inputs:

    Register form: again, feel free to be anyone you want
        Example (DOES NOT EXIST YET)
            Username: hermione1
            Password: crookshanksRocks

    Log in form (log in with the account you just registered with)
        Example if you didn’t register
            Username: dummy3
            Password: magic

    Post upload form: you can input anything you want! Your post should be automatically uploaded to the feed, with your photo (has to be jpeg)
        Example:
            Title: Hedwig spotted at the KSC Tennis Courts!
            Species: Owl
            Location: KSC
            Sighting Time: 11:30PM
            Sighting Date: 07/31/2026
            Description: I was walking to the tennis courts when I saw Hedwig perched on a lamppost with a letter clutched in her claw. I hope it’s for me!

    Post update form: you can input anything you want! This will only be an option if you are the author of a post. You can edit any part of the post, including uploading a new image.
        Example:
            Title: Crookshanks spotted at the Tower Court!
            Species: Cat
            Picture: (must be a photo of a cat now!)
            Location: Tower Court
            Sighting Time: 11:30PM
            Sighting Date: 07/31/2026
            Description: I was walking to our wabanimals meeting when I saw Crookshanks lurking in the shadows.

    Search: by species or location
        Example: 
            Search term: “goose”, kind: species
            Search term: “blah blah”, kind: species - Doesn’t return any posts, should return “No results found”
            Search term: “botanical”, kind: location
            Search term: “123”, kind: location - Doesn’t return any posts, should display “No results found”

    Directions to use:
        Run the page. It will immediately take you to the register/log in page - sign up!
        Takes you to the home page
        Look at our beautiful feed!
        Go to upload on the nav bar
        Insert a post - use our example above (no photo provided)!
        It takes you back to the homepage, look at the post you just inserted!
        Go to your profile page and see that you’ve now created ONE post
        Like your post!
        Comment on your post or on anyones! **new
        Check your profile page - you should now have 1 comment in the stats bar
        Go to search and use our search terms above
        Go back to the home page - edit your post with the information provided above
        Delete your post
        Your profile page should now say zero posts
        Click the logout button to log out!
        Log in as "ari" who is admin (details above!) **new
        Check out the admin dashboard **new
        Make a user admin (anyone you want) **new
        Remove admin status from someone (anyone you want) **new
        Delete a user (preferably not "ari") **new
        Have fun!
