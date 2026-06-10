# Basic security
There is a need to add some basic security controls before hosting the app on the internet. Mostly around preventing brute force, preventing
AI agents from scanning (robot.txt), prevent someone abusing the app and causing a big bill from high traffic.

## Ideas on controls:
Brute force protection: rate limiting in node/type script.

examples:
- returning non descriptive errors - generic errors messages:
```ts
return res.status(401).json({ error: 'Invalid credentials' });
```

- Tracking failed attempts, implementing lockout logic, reset failed attempt count on successful login

This code snippet initializes an object to store the number of failed attempts for each username. The key is the username, and the value is the count of failed attempts.

```ts
const failedAttempts: { [key: string]: number } = {};

```
In this code snippet, we first check if the account is already locked by verifying if there is an entry in the lockedAccounts object for the given username. We also compare the current time (Date.now()) with the lockout expiration time stored in lockedAccounts[username]. If the current time is less than the expiration time, it means the account is still locked, and we return a 429 status code with an appropriate error message.
```ts
// Check if account is locked
if (lockedAccounts[username] && Date.now() < lockedAccounts[username]) {
  return res.status(429).json({
    error: 'Account temporarily locked. Please try again later.'
  });
}
```

 increment the count of failed login attempts for the username. We use the logical OR (||) operator to initialize the count to 0 if it doesn't already exist, ensuring that the count starts from zero for new entries.
```ts
// Increment failed attempts
failedAttempts[username] = (failedAttempts[username] || 0) + 1
```

check if the number of failed attempts has reached or exceeded the predefined LOCK_THRESHOLD. If it has, we lock the account by setting an expiration time in the lockedAccounts object, calculated as the current time plus the LOCK_DURATION. We then return a 429 status code with a message indicating that the account is temporarily locked.
```ts
// Lock account if threshold is reached
if (failedAttempts[username] >= LOCK_THRESHOLD) {
  lockedAccounts[username] = Date.now() + LOCK_DURATION;
  return res.status(429).json({
    error: 'Account temporarily locked. Please try again later.'
  });
}
```


reset the failed attempts count after a successful login.
```ts
// Reset failed attempts on successful login
delete failedAttempts[username];
```


Reference: https://codesignal.com/learn/courses/authentication-and-authorization-in-express-with-typescript/lessons/account-lockout-and-enumeration-prevention

# Database Access Security
There needs to be a secure way to access the database when hosted on the internet, so that the credentials are hard to steal.

## ideas:
- hard at the moment because no CICD. Eventually it will be hosted in Neon
