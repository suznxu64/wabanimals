Project Description: Wabanimals, a Wellesley animal sighting social media platform. Users can post animals that they’ve seen around campus and look at what other users have posted. 
Group Members: Ari, Suzy, Nivale

Account: wabanimals
Directory: alpha

URLs to Test: 
/ (redirects to register page)
/register 
/login (not on nav)
/home  (home page with feed, on nav bar)
/logout on the nav bar
/search (search by species and location)
/upload (to upload form - everything but image/video upload works)
/profile (tells you how many posts you’ve uploaded when logged in)
/about (about the project)

Sample usernames and inputs:

    Register form: again, feel free to be anyone you want
        Example (DOES NOT EXIST YET)
            Username: hermione
            Password: crookshanksRocks!

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
            Search term: “hawk”, kind: species
            Search term: “blah blah”, kind: species - Doesn’t return any posts, should return “No results found”
            Search term: “Bates”, kind: location
            Search term: “123”, kind: location - Doesn’t return any posts, should display “No results found”

    Directions to use:
        It will immediately take you to the register/log in page - sign up!
        Takes you to the home page
        Look at our beautiful feed!
        Go to upload on the nav bar
        Insert a post - use our example above (no photo provided)!
        It takes you back to the homepage, look at the post you just inserted!
        Go to your profile page and see that you’ve now created ONE post
        Like your post!
        Go to search and use our search terms above
        Go back to the home page - edit your post with the information provided above
        Delete your post
        Your profile page should now say zero posts
        Click the logout button to log out!
        Go to /login
        Login with the same credentials you created earlier - it should send you to the home page
        Have fun!

