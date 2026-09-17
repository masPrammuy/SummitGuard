import sys
import os
import re
import subprocess

def get_git_root():
    res = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True)
    return res.stdout.strip()

def cmd_workspace(plan_file):
    root = get_git_root()
    slug = os.path.splitext(os.path.basename(plan_file))[0]
    base = os.path.join(root, ".superpowers", "sdd")
    workspace_dir = os.path.join(base, slug)
    os.makedirs(workspace_dir, exist_ok=True)
    with open(os.path.join(base, ".gitignore"), "w", encoding="utf-8") as f:
        f.write("*\n")
    print(workspace_dir)
    return workspace_dir

def cmd_brief(plan_file, task_n, outfile=None):
    workspace_dir = cmd_workspace(plan_file)
    if not outfile:
        outfile = os.path.join(workspace_dir, f"task-{task_n}-brief.md")
    
    with open(plan_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    task_pattern = re.compile(rf"^###\s+Task\s+{task_n}(?:\D|$)", re.IGNORECASE)
    next_task_pattern = re.compile(r"^###\s+Task\s+\d+", re.IGNORECASE)
    
    in_task = False
    task_lines = []
    
    for line in lines:
        if task_pattern.match(line):
            in_task = True
            task_lines.append(line)
        elif in_task and next_task_pattern.match(line):
            break
        elif in_task and line.strip() == "---":
            # separator between tasks
            break
        elif in_task:
            task_lines.append(line)
            
    if not task_lines:
        print(f"Error: task {task_n} not found in {plan_file}", file=sys.stderr)
        sys.exit(3)
        
    with open(outfile, "w", encoding="utf-8") as f:
        f.writelines(task_lines)
        
    print(f"wrote {outfile}: {len(task_lines)} lines")
    return outfile

def cmd_review(plan_file, base, head, outfile=None):
    workspace_dir = cmd_workspace(plan_file)
    if not outfile:
        base_short = subprocess.run(["git", "rev-parse", "--short", base], capture_output=True, text=True, check=True).stdout.strip()
        head_short = subprocess.run(["git", "rev-parse", "--short", head], capture_output=True, text=True, check=True).stdout.strip()
        outfile = os.path.join(workspace_dir, f"review-{base_short}..{head_short}.diff")
        
    log_res = subprocess.run(["git", "log", "--oneline", f"{base}..{head}"], capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout
    stat_res = subprocess.run(["git", "diff", "--stat", f"{base}..{head}"], capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout
    diff_res = subprocess.run(["git", "diff", "-U10", f"{base}..{head}"], capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout

    
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(f"# Review package: {base}..{head}\n\n")
        f.write("## Commits\n")
        f.write(log_res + "\n\n")
        f.write("## Files changed\n")
        f.write(stat_res + "\n\n")
        f.write("## Diff\n")
        f.write(diff_res + "\n")
        
    print(f"wrote {outfile}: {base}..{head}")
    return outfile

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python sdd_tools.py [workspace|brief|review] [args...]")
        sys.exit(1)
    action = sys.argv[1]
    if action == "workspace":
        cmd_workspace(sys.argv[2])
    elif action == "brief":
        cmd_brief(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
    elif action == "review":
        cmd_review(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else None)
    else:
        print(f"Unknown action {action}")
        sys.exit(1)
