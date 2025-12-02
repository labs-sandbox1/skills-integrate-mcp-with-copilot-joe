"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Request, Response, Cookie, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import secrets
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path


app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Allow CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# In-memory activity database
USERS_FILE = os.path.join(Path(__file__).parent, "users.json")

# Load users from file
def load_users():
    with open(USERS_FILE, "r") as f:
        return json.load(f)

# In-memory session store: {token: user_dict}
sessions = {}
@app.post("/login")
def login(data: dict, response: Response):
    """Authenticate user and return session token"""
    email = data.get("email")
    password = data.get("password")
    users = load_users()
    user = next((u for u in users if u["email"] == email and u["password"] == password), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Generate session token
    token = secrets.token_urlsafe(32)
    sessions[token] = user
    response.set_cookie(key="session_token", value=token, httponly=True)
    return {"message": "Login successful", "role": user["role"], "name": user["name"]}

@app.post("/logout")
def logout(response: Response, session_token: str = Cookie(None)):
    """Logout user by removing session token"""
    if session_token and session_token in sessions:
        sessions.pop(session_token)
    response.delete_cookie("session_token")
    return {"message": "Logged out"}

# Utility to get current user from session
def get_current_user(session_token: str = Cookie(None)):
    if not session_token or session_token not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return sessions[session_token]

# Role-based dependency
def require_role(required_roles):
    def role_checker(user=Depends(get_current_user)):
        if user["role"] not in required_roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return role_checker

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities



# Only authenticated users can sign up
@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, user=Depends(get_current_user)):
    """Sign up a student for an activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity = activities[activity_name]
    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}



# Only authenticated users can unregister
@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, user=Depends(get_current_user)):
    """Unregister a student from an activity"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity = activities[activity_name]
    if email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}

# Example: Only staff/admin can create new activities
@app.post("/activities/create")
def create_activity(activity: dict, user=Depends(require_role(["staff", "admin"]))):
    name = activity.get("name")
    if not name or name in activities:
        raise HTTPException(status_code=400, detail="Invalid or duplicate activity name")
    activities[name] = {
        "description": activity.get("description", ""),
        "schedule": activity.get("schedule", ""),
        "max_participants": activity.get("max_participants", 10),
        "participants": []
    }
    return {"message": f"Activity '{name}' created"}
