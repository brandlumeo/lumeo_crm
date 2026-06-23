from accounts.models import User

try:
    admin_user = User.objects.get(email='johndoe@gmail.com')
    manager_email = 'manager@lumeo.com'
    manager_password = 'Password123!'
    
    # Check if exists
    if User.objects.filter(email=manager_email).exists():
        print(f"User {manager_email} already exists.")
    else:
        manager_user = User.objects.create_user(
            username=manager_email,
            email=manager_email,
            password=manager_password,
            first_name='Manager',
            last_name='User',
            role=User.Role.MANAGER,
            company=admin_user.company
        )
        print(f"Manager user created successfully.")
        print(f"Email: {manager_email}")
        print(f"Password: {manager_password}")
except User.DoesNotExist:
    print("Admin user johndoe@gmail.com not found!")
except Exception as e:
    print(f"An error occurred: {e}")
