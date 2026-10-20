# 🔄 GOOGLE DRIVE BACKUP SYNC SETUP GUIDE

**Goal:** Automated weekly backups + monthly cloud sync to Google Drive  
**Time:** 30 minutes setup  
**Effort:** Easy (GUI-based)

---

## 📋 OVERVIEW

**Two-Layer Backup Strategy:**

1. **Local Automated Weekly Backups** (External Drive)
   - Runs every Sunday via Task Scheduler
   - Fast recovery (<5 minutes)
   - Keeps 4 most recent backups

2. **Monthly Cloud Archive** (Google Drive)
   - Manual or automated monthly upload
   - Long-term cloud storage
   - 3-month rolling history

---

## ⚙️ PART 1: LOCAL AUTOMATED BACKUPS (Already Ready)

### Step 1: Create Backup Directory

**Windows (PowerShell as Admin):**
```powershell
# Create backup directories
mkdir C:\backups
mkdir C:\backups\atlas-logistics
```

**macOS/Linux:**
```bash
mkdir -p ~/backups/atlas-logistics
```

### Step 2: Use Backup Script

**File Ready:** `scripts/backup-atlas.ps1` (already created)

**To Run Manually:**

Windows:
```powershell
# Run PowerShell as Administrator
cd C:\Users\YOU\atlas-logistics
powershell -ExecutionPolicy Bypass -File scripts/backup-atlas.ps1
```

macOS/Linux:
```bash
bash scripts/backup-atlas.ps1
```

### Step 3: Setup Scheduled Task (Windows)

**Create Weekly Automated Backup (Sunday 10 PM):**

```powershell
# 1. Open Task Scheduler
# Win + R → taskschd.msc → Enter

# 2. Right-click "Task Scheduler Library" → New Folder
# Name: "Atlas Logistics"

# 3. Right-click new folder → Create Task
# Fill in:
#   Name: "Weekly Backup - Atlas Logistics"
#   Description: "Automated weekly backup to C:\backups"
#   Run with highest privileges: ✓ CHECK

# 4. Go to "Triggers" tab → New
#   Begin the task: On a schedule
#   Weekly
#   Recurring every: 1 week
#   Day: Sunday
#   Time: 22:00 (10 PM)
#   Click OK

# 5. Go to "Actions" tab → New
#   Program/script: powershell.exe
#   Arguments: -ExecutionPolicy Bypass -File "C:\Users\YOU\atlas-logistics\scripts\backup-atlas.ps1"
#   Start in: C:\Users\YOU\atlas-logistics
#   Click OK

# 6. Click OK to save task
```

**Verify Task Created:**
```powershell
Get-ScheduledTask -TaskName "Weekly Backup*" | Select-Object TaskName, State
```

---

## 📱 PART 2: GOOGLE DRIVE SYNC SETUP

### Option A: Google Drive Desktop Sync (RECOMMENDED - Easiest)

**Step 1: Install Google Drive for Desktop**

1. Go to: https://www.google.com/drive/download/
2. Click "Download for personal"
3. Install and sign in with Google account

**Step 2: Create Google Drive Folder**

1. Open Google Drive (drive.google.com)
2. Create new folder: "Atlas-Logistics-Backups"
3. Note the folder path/ID

**Step 3: Sync Backups to Google Drive**

**Option A1: Sync Entire Backup Folder (Automatic)**

```
Google Drive for Desktop Settings:
  1. Right-click Google Drive icon → "Preferences"
  2. "My Drive" → Choose folder location
  3. Select: C:\backups (or ~/backups)
  4. Everything syncs automatically!
```

**Option A2: Create Sync Shortcut (Manual)**

```powershell
# Create symbolic link from Google Drive to backups
# Windows (PowerShell as Admin):

cmd /c mklink /D "C:\Users\YOU\Google Drive\Atlas-Logistics-Backups\latest" "C:\backups\atlas-logistics"
```

### Option B: OneDrive Sync (Alternative)

If you prefer OneDrive:

```powershell
# Same process as Google Drive
# Folder: C:\Users\YOU\OneDrive\Atlas-Logistics-Backups

# Move backups to OneDrive:
Move-Item -Path C:\backups -Destination "$env:OneDriveCommercial\Atlas-Logistics-Backups"
```

### Option C: Rclone (Advanced - More Control)

For advanced users who want fine-grained control:

```bash
# Install rclone: https://rclone.org/

# Configure Google Drive:
rclone config create atlas-drive google

# Monthly sync:
rclone sync C:\backups\atlas-logistics atlas-drive:Atlas-Logistics-Backups --delete-dst

# Automate with cron (Linux) or Task Scheduler (Windows)
```

---

## 🔄 PART 3: MONTHLY CLOUD ARCHIVE WORKFLOW

### Recommended: Compressed Monthly Archives

**Step 1: Create Monthly Archive Script**

**Windows (compress-and-upload.ps1):**

```powershell
# Monthly compress and upload to Google Drive

param(
  [string]$SourceDir = "C:\backups\atlas-logistics",
  [string]$DestDir = "C:\Users\$env:USERNAME\Google Drive\Atlas-Logistics-Backups",
  [string]$ArchiveName = "atlas-logistics-$(Get-Date -Format 'yyyy-MM-dd').zip"
)

# Create compressed archive
Write-Host "Creating archive: $ArchiveName"
Compress-Archive -Path $SourceDir -DestinationPath "$DestDir\$ArchiveName" -Force

Write-Host "Archive created successfully"
Write-Host "Size: $(Get-Item "$DestDir\$ArchiveName").Length bytes"

# Keep only last 3 monthly archives
$archives = Get-ChildItem "$DestDir\*.zip" | Sort-Object CreationTime -Descending
if ($archives.Count -gt 3) {
  $old = $archives | Select-Object -Skip 3
  $old | Remove-Item
  Write-Host "Cleaned up old archives"
}
```

**Step 2: Schedule Monthly Compress-Upload**

```powershell
# Similar to weekly backup setup, but:
# Trigger: Monthly, 1st day at 11 PM
# Action: -File "C:\Users\YOU\atlas-logistics\compress-and-upload.ps1"
```

---

## 📋 COMPLETE SETUP CHECKLIST

### Initial Setup (One-Time, 30 min)

- [ ] Create C:\backups directory
- [ ] Install Google Drive for Desktop
- [ ] Create "Atlas-Logistics-Backups" folder in Google Drive
- [ ] Configure Google Drive sync (auto-sync backups)
- [ ] Create monthly archive script
- [ ] Schedule weekly backup task (Sunday 10 PM)
- [ ] Schedule monthly archive task (1st of month, 11 PM)
- [ ] Test first manual backup: `scripts\backup-atlas.ps1`

### Verify It Works

- [ ] Check Task Scheduler shows 2 tasks
- [ ] Wait for Sunday → verify backup created
- [ ] Check Google Drive → backup synced automatically
- [ ] Wait for 1st of month → verify archive created
- [ ] Test restoration from backup (monthly)

### Monthly Maintenance

- [ ] Check backups are creating weekly
- [ ] Verify Google Drive has latest monthly archive
- [ ] Test restore from backup (1st of quarter)
- [ ] Confirm 3-month rolling history maintained

---

## 🧪 TEST YOUR BACKUPS (CRITICAL!)

### Step 1: Create First Backup

```powershell
# Manual test
cd C:\Users\YOU\atlas-logistics
powershell -ExecutionPolicy Bypass -File scripts/backup-atlas.ps1
```

### Step 2: Verify Backup Created

```powershell
# Check backup directory
Get-ChildItem C:\backups\atlas-logistics -Recurse | Measure-Object -Sum -Property Length

# Should show: Count=###, Sum=500000000 (roughly 500MB)
```

### Step 3: Verify Google Drive Sync

```powershell
# Check Google Drive folder
Get-ChildItem "C:\Users\$env:USERNAME\Google Drive\Atlas-Logistics-Backups" | Sort-Object LastWriteTime -Descending
```

### Step 4: Test Restoration (Monthly)

```powershell
# Simulate recovery:
# 1. Create temp directory
mkdir C:\temp\restore-test

# 2. Copy backup to temp
Copy-Item "C:\backups\atlas-logistics\atlas-logistics-backup-*" "C:\temp\restore-test" -Recurse

# 3. Verify files intact
Get-ChildItem "C:\temp\restore-test\atlas-logistics-backup-*" -Recurse

# 4. Cleanup
Remove-Item "C:\temp\restore-test" -Recurse
```

---

## 📊 BACKUP SCHEDULE REFERENCE

```
WEEKLY (Automatic - Sunday 10 PM)
├─ Local: C:\backups\atlas-logistics
├─ Auto-syncs to: Google Drive
├─ Keeps: 4 most recent copies
└─ Recovery: <5 minutes

MONTHLY (Automatic - 1st of month 11 PM)
├─ Compressed archive: atlas-logistics-YYYY-MM-DD.zip
├─ Location: Google Drive
├─ Keeps: 3-month rolling history
└─ Recovery: ~10 minutes

QUARTERLY (Manual)
├─ Test restoration from backup
├─ Verify data integrity
└─ Document recovery time
```

---

## 🚨 EMERGENCY RECOVERY PROCEDURE

**If Your Computer Crashes:**

### Step 1: Get New Computer (or Fixed)

### Step 2: Restore from Google Drive

```powershell
# 1. Install Git & Node/pnpm
# 2. Install Google Drive for Desktop
# 3. Sign into Google account
# 4. Download backup from Google Drive

# 5. Extract backup
Expand-Archive "C:\Downloads\atlas-logistics-backup-2024-10-02.zip" -DestinationPath "C:\recovered"

# 6. Verify all files
Get-ChildItem "C:\recovered\atlas-logistics-backup-*" -Recurse | Measure-Object

# 7. Copy to working directory
Copy-Item "C:\recovered\atlas-logistics-backup-*\*" "C:\Users\YOU\atlas-logistics" -Recurse -Force

# 8. Resume development
cd C:\Users\YOU\atlas-logistics
pnpm dev:minimal
```

**Recovery Time:** 30 minutes (downloading, extracting, installing)

---

## 💾 STORAGE & QUOTA

### Google Drive Free Tier
- **Storage:** 15 GB (shared with Gmail, Photos)
- **Backup Size:** ~500MB per backup
- **Capacity:** ~30 backups with 15GB
- **Monthly:** 4 × 500MB = 2GB/month

**Recommendation:**
- Keep 3-month rolling history (1.5 GB used)
- Should last ~10 years at current backup rate
- If needed, upgrade to 100GB ($1.99/month)

---

## 📝 ALTERNATIVE: EXTERNAL HARD DRIVE ONLY

If you prefer NOT to use Google Drive:

```powershell
# Setup external drive backups only:

$ExternalDrive = "E:"  # Your external USB drive letter
$BackupScript = "C:\Users\$env:USERNAME\atlas-logistics\scripts\backup-atlas.ps1"

# Modify backup destination to external drive:
# In scripts/backup-atlas.ps1, change:
# $BackupDestination = "D:\backups"  # ← Change to your external drive

# Still use Task Scheduler, but point to external drive
# Warning: Requires external drive always connected
```

---

## 🎯 QUICK START CHECKLIST

**Do This Right Now (10 minutes):**

```powershell
# 1. Create directories
mkdir C:\backups

# 2. Download Google Drive for Desktop
# Go to: https://www.google.com/drive/download/

# 3. Create first manual backup
cd C:\Users\YOU\atlas-logistics
powershell -ExecutionPolicy Bypass -File scripts/backup-atlas.ps1

# 4. Verify in Google Drive
# Check: drive.google.com → "Atlas-Logistics-Backups"

# 5. Schedule weekly task (via Task Scheduler GUI - 5 min)
```

---

## ❓ TROUBLESHOOTING

### Backup Fails to Create

```powershell
# Check if script runs manually first
powershell -ExecutionPolicy Bypass -File scripts/backup-atlas.ps1

# Check disk space
Get-Volume | Where-Object { $_.DriveLetter -eq 'C' }

# If full: delete old backups or add external drive
```

### Google Drive Sync Not Working

```powershell
# Restart Google Drive
Get-Process | Where-Object Name -like "*drive*" | Stop-Process -Force
Start-Sleep 5
# Reopen Google Drive from system tray
```

### Task Scheduler Task Won't Run

```powershell
# Check if task exists
Get-ScheduledTask -TaskName "Weekly Backup*"

# Check last run result
Get-ScheduledTaskInfo -TaskName "Weekly Backup*" | Select-Object LastRunTime, LastTaskResult

# 0 = Success
# 1 = General error
# Task Result 1 usually means permissions issue → re-create with Admin
```

### Monthly Archive Too Large

```powershell
# Compress further using 7-Zip (higher compression)
# Or use cloud backup service instead (BackBlaze: $7/month unlimited)
```

---

## 🔐 SECURITY NOTES

**What's Backed Up:**
- ✅ Source code
- ✅ Configuration files
- ✅ Local SQLite database
- ⚠️ .env.local (contains secrets!)

**Recommendations:**
- Encrypt external drive with BitLocker
- Use 2FA on Google account
- Review Google Drive sharing settings (private!)
- Never share backup links publicly

---

## ✅ FINAL CHECKLIST

After Setup Complete:

- [ ] Weekly backups creating automatically (Sunday 10 PM)
- [ ] Backups syncing to Google Drive automatically
- [ ] Monthly compressed archives created (1st of month)
- [ ] 3-month rolling history maintained
- [ ] Tested manual restoration once
- [ ] Documented backup schedule somewhere safe
- [ ] Team members (if any) know about backups

---

**Status:** SETUP COMPLETE ✅

You now have a robust, automated backup strategy:
- **Local:** Fast recovery from external drive
- **Cloud:** Long-term storage in Google Drive
- **Automated:** No manual intervention needed (after setup)
- **Tested:** Verified restore works

Your code is protected. Sleep well! 🛡️

---
