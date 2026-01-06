# Testing Guide - Sprint 1: Password Encryption

## What to Test

This guide will help you test the new password encryption features for the Virtual High Street.

---

## Prerequisites

- The dev server should be running at http://localhost:5173/
- You should have a fresh browser (or clear localStorage to start fresh)
- Modern browser (Chrome, Firefox, Edge)

---

## Test 1: First-Time Setup (Master Password Creation)

### Steps:
1. Open http://localhost:5173/
2. You should see a **"Welcome to Personal Hub"** screen
3. Look for the "Set up your master password to secure your sensitive data" message

### Test the Password Creation:
1. Try entering a weak password (e.g., "123")
   - ✅ Should show "Very Weak" in red
2. Try entering a medium password (e.g., "password123")
   - ✅ Should show "Weak" or "Fair"
3. Enter a strong password (e.g., "MyStr0ng!Pass2026")
   - ✅ Should show "Strong" or "Very Strong" in green
   - ✅ Strength bar should fill up
4. Enter different passwords in the two fields
   - ✅ Should show error "Passwords do not match"
5. Make both match with a strong password
   - ✅ Click "Create Master Password"
   - ✅ Should redirect you to the main dashboard

### Expected Result:
- You should now see the Personal Hub dashboard
- Footer should say "All data is encrypted and stored locally"

---

## Test 2: Add Encrypted Passwords

### Steps:
1. On the dashboard, click the **"Websites"** card
2. You should see the Virtual High Street modal
3. Look for the green **"Encrypted"** badge next to the title

### Add a Website:
1. Click the **"Add New Shop to Your High Street"** button
2. Fill in the form:
   - **Name:** "Test Bank"
   - **URL:** "testbank.com"
   - **Category:** "Banking & Finance"
   - **Username:** "testuser@example.com"
   - **Password:** Click the refresh icon (🔄) to generate a password
     - ✅ Should generate a random 16-character password
     - ✅ Should show strength indicator
3. Click **"Add to High Street"**
4. ✅ Should appear in the Banking & Finance section

### Add More Websites:
Repeat the process with:
- **Name:** "Test Shop", **Category:** "Shopping", generate password
- **Name:** "Test Social", **Category:** "Social Media", generate password

### Expected Result:
- You should see 3 websites organized by category
- Each should have a colored card
- Each should show a favicon (or initials if favicon fails)

---

## Test 3: View and Copy Passwords

### In List View:
1. Click the **List** icon (☰) in the top right
2. ✅ Passwords should show as `••••••••`
3. Click the **eye icon** next to a password
   - ✅ Password should become visible
4. Click the **copy icon** next to a password
   - ✅ Icon should change to a checkmark briefly
   - ✅ Password should be in your clipboard (paste to verify)
5. Click the **eye icon** again
   - ✅ Password should hide again

### In Detail Modal:
1. Click back to **Grid view** (⊞)
2. Click on one of the website cards
3. ✅ Should open a detail modal
4. Test the eye/copy icons in the modal
5. ✅ Should work the same as list view

---

## Test 4: Export and Import

### Export:
1. While in Virtual High Street, click **"Export"** button
2. ✅ Should download a JSON file named `virtual-high-street-backup-2026-01-06.json`
3. Open the file in a text editor
4. ✅ Should see your websites in **plain text** (this is for backup purposes)
5. ✅ Passwords should be visible in the export (decrypted for portability)

### Import:
1. Delete one of your websites (click the trash icon)
2. Click **"Import"** button
3. Select the JSON file you just downloaded
4. ✅ Should show "Successfully imported X entries!"
5. ✅ Deleted website should reappear

---

## Test 5: Encryption Persistence (Most Important!)

### Steps:
1. With several websites added, close the Virtual High Street modal
2. **Completely close your browser** (not just the tab)
3. Reopen your browser
4. Navigate to http://localhost:5173/

### Expected:
1. ✅ Should show the **"Welcome Back"** unlock screen
2. ✅ Should say "Enter your master password to unlock your Personal Hub"

### Test Wrong Password:
1. Enter an incorrect password
   - ✅ Should show "Incorrect password. Attempt 1 of 5."
2. Try 4 more wrong passwords
   - ✅ After 5 attempts, should lock you out
   - ✅ Should show message to reload the page

### Test Correct Password:
1. Reload the page (F5 or Ctrl+R)
2. Enter your **correct** master password
3. ✅ Should unlock and show the dashboard
4. Open **"Websites"** again
5. ✅ Your websites should still be there
6. ✅ Check if passwords are correct (click eye icon)

---

## Test 6: Password Generator

### Steps:
1. Open Virtual High Street
2. Click "Add New Shop"
3. In the password field, click the **refresh icon (🔄)**
4. ✅ Should generate a new random password each time
5. ✅ Each password should be 16 characters
6. ✅ Should include uppercase, lowercase, numbers, and symbols
7. ✅ Strength indicator should show "Very Strong" (green)

---

## Test 7: Data Verification (Advanced)

### Check Browser Storage:
1. Open browser DevTools (F12)
2. Go to **Application** → **Local Storage** → http://localhost:5173
3. Find the key `virtual_street_encrypted`
4. ✅ Value should look like gibberish/base64 (e.g., "aB3d9...")
5. ✅ Should NOT contain readable passwords
6. Find the key `master_password_hash`
7. ✅ Should exist and be a long base64 string
8. ✅ Should NOT be your actual password

---

## Test 8: Edge Cases

### Empty States:
1. Delete all websites from Virtual High Street
2. ✅ Should show "Your High Street is Empty" message
3. ✅ Should show example websites

### Special Characters:
1. Add a website with special characters in the name: "Test & Co."
2. Add a password with special characters: `P@$$w0rd!#%`
3. ✅ Should save and decrypt correctly

### Long URLs:
1. Add a website with a very long URL
2. ✅ Should handle gracefully (truncate or wrap)

---

## Known Issues / Expected Behavior

### Expected Behaviors:
- **Master password is NOT recoverable** - If you forget it, you'll need to clear localStorage and start over
- **Export is unencrypted** - This is intentional for portability (you can import into another browser)
- **Favicon may fail** - If a website's favicon doesn't load, initials are shown instead
- **5-attempt limit** - After 5 wrong password attempts, you must reload the page

### Things That Won't Work Yet:
- ❌ Other features (Documents, Finance, etc.) are **not encrypted** yet
- ❌ No "change master password" feature yet
- ❌ No "forgot password" recovery (intentional security choice)

---

## Success Criteria

### ✅ Sprint 1 is successful if:
1. You can create a master password on first launch
2. You can add websites with passwords
3. Password generator works and creates strong passwords
4. Passwords are hidden by default, can be revealed
5. Copy to clipboard works
6. Export/import works
7. After closing browser, unlock screen appears
8. Correct password unlocks, wrong password fails
9. Passwords are stored encrypted (check DevTools)
10. All passwords decrypt correctly after unlock

---

## Reporting Issues

If you find any bugs or unexpected behavior:

1. **Note the exact steps** to reproduce
2. **Check browser console** (F12 → Console) for errors
3. **Let me know:**
   - What you were doing
   - What you expected
   - What actually happened
   - Any error messages

I can fix issues quickly since we're using git!

---

## What's Next?

After testing, we can:
1. Fix any bugs you find
2. Add missing features (change password, better error messages, etc.)
3. Move to **Sprint 2**: Possibly encrypt Finance data, or add real file uploads to Documents

---

**Happy Testing!** 🧪🔒

Let me know how it goes!
