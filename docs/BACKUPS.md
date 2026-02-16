# Backups

Personal Hub protects your data with automatic and manual backups.

## Automatic Backups

Backups are created automatically in the background as you use the app. You don't need to do anything.

**How it works:**
- After every 5 saves (adding, editing, or deleting records), an automatic backup is created
- If you close the app with unsaved-backup changes, the backup happens next time you open it
- The last 5 automatic backups are kept; older ones are deleted automatically
- Backups are stored in `~/Documents/PersonalHub/backups/auto/`

**What's included:**
- All encrypted data files (every panel's data)
- All encrypted document files (PDFs, images, etc.)
- Your master key file (so the backup is self-contained)

Automatic backups happen silently without slowing down the app. If no changes have been made, no backup is created.

## Manual Backups

You can create a manual backup at any time:

1. Click **Backup & Restore** on the main dashboard
2. Click **Create Backup**
3. Choose where to save the `.phub` file (e.g. external drive, cloud folder)

Manual backups are useful for keeping a copy off your computer.

## Restoring from a Backup

### From an Automatic Backup

1. Click **Backup & Restore** on the main dashboard
2. Scroll to the **Restore** section
3. Under **Automatic Backups**, you'll see your recent backups listed by date and size
4. Click **Restore** next to the one you want
5. Review what's in the backup, then confirm

### From a Manual Backup

1. Click **Backup & Restore** on the main dashboard
2. Click **Open Backup File**
3. Select your `.phub` file
4. Review what's in the backup, then confirm

In both cases, a safety backup of your current data is offered before restoring.

## Integrity Checks

When you open the app, it automatically checks that all document files referenced in your data actually exist on disk. If any files are missing (e.g. due to accidental deletion), a warning banner appears at the top of the dashboard with a link to Backup & Restore where you can investigate or restore from a backup.

You can also run a manual integrity check from inside Backup & Restore at any time.
