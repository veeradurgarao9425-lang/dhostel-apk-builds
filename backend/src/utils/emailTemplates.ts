export const getWelcomeEmailTemplate = (ownerName: string, hostelName: string, endDate: string) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Welcome to Hostix, ${ownerName}!</h2>
  <p>Your hostel <strong>${hostelName}</strong> has been successfully registered.</p>
  <p>You have received a <strong>40-day free trial</strong> to explore all our features.</p>
  <p>Your trial will expire on <strong>${endDate}</strong>.</p>
  <p>If you have any questions, feel free to reach out to our support team.</p>
</div>
`;

export const getSuperAdminNewRegistrationTemplate = (hostel: any) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>New Hostel Registration Alert</h2>
  <p>A new hostel has registered on the platform.</p>
  <ul>
    <li><strong>Hostel Name:</strong> ${hostel.hostel_name}</li>
    <li><strong>Owner Name:</strong> ${hostel.full_name}</li>
    <li><strong>Email:</strong> ${hostel.email}</li>
    <li><strong>Mobile Number:</strong> ${hostel.phone}</li>
    <li><strong>Trial Start Date:</strong> ${hostel.trial_start_date}</li>
    <li><strong>Trial End Date:</strong> ${hostel.trial_end_date}</li>
  </ul>
</div>
`;

export const getTrialReminderTemplate = (ownerName: string, hostelName: string, daysRemaining: number, expiryDate: string) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Trial Expiry Reminder</h2>
  <p>Hello ${ownerName},</p>
  <p>Your free trial for <strong>${hostelName}</strong> is expiring soon.</p>
  <p><strong>Days Remaining:</strong> ${daysRemaining} days</p>
  <p><strong>Expiry Date:</strong> ${expiryDate}</p>
  <br/>
  <a href="#" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Renew Subscription</a>
</div>
`;

export const getSubscriptionExpiredTemplate = (ownerName: string, hostelName: string) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Subscription Expired</h2>
  <p>Hello ${ownerName},</p>
  <p>Your subscription for <strong>${hostelName}</strong> has expired.</p>
  <p>Your data is safe, but management features are currently locked.</p>
  <p>Please renew your subscription to restore access.</p>
  <br/>
  <a href="#" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Renew Now</a>
</div>
`;

export const getSuperAdminExpiryTemplate = (hostel: any) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Hostel Subscription Expired Alert</h2>
  <p>The following hostel's subscription has expired and was marked inactive:</p>
  <ul>
    <li><strong>Hostel Name:</strong> ${hostel.hostel_name}</li>
    <li><strong>Owner Email:</strong> ${hostel.email}</li>
  </ul>
</div>
`;

export const getRenewalConfirmationTemplate = (ownerName: string, hostelName: string, endDate: string) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Subscription Renewed Successfully</h2>
  <p>Hello ${ownerName},</p>
  <p>Thank you for renewing your subscription for <strong>${hostelName}</strong>.</p>
  <p>Your account is now fully active until <strong>${endDate}</strong>.</p>
</div>
`;

export const getSuperAdminRenewalTemplate = (hostel: any) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Hostel Renewed Alert</h2>
  <p>The following hostel has renewed its subscription:</p>
  <ul>
    <li><strong>Hostel Name:</strong> ${hostel.hostel_name}</li>
    <li><strong>Plan:</strong> ${hostel.subscription_plan}</li>
    <li><strong>New Expiry:</strong> ${hostel.subscription_end_date}</li>
  </ul>
</div>
`;

export const getWeeklyReportTemplate = (ownerName: string, hostelName: string, report: any) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Weekly Business Report: ${hostelName}</h2>
  <p>Hello ${ownerName}, here is your summary for the week:</p>
  <ul>
    <li><strong>Total Students:</strong> ${report.totalStudents}</li>
    <li><strong>Occupied Beds:</strong> ${report.occupiedBeds}</li>
    <li><strong>Available Beds:</strong> ${report.availableBeds}</li>
    <li><strong>Occupancy %:</strong> ${report.occupancyPercentage}%</li>
    <li><strong>New Admissions:</strong> ${report.newAdmissions}</li>
    <li><strong>Vacated Students:</strong> ${report.vacatedStudents}</li>
    <li><strong>Collections:</strong> ₹${report.collections}</li>
    <li><strong>Expenses:</strong> ₹${report.expenses}</li>
    <li><strong>Pending Payments:</strong> ₹${report.pendingPayments}</li>
  </ul>
</div>
`;

export const getMonthlyReportTemplate = (ownerName: string, hostelName: string, report: any) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Monthly Business Report: ${hostelName}</h2>
  <p>Hello ${ownerName}, here is your detailed performance report for the month:</p>
  <ul>
    <li><strong>Monthly Revenue:</strong> ₹${report.revenue}</li>
    <li><strong>Total Expenses:</strong> ₹${report.expenses}</li>
    <li><strong>Net Profit:</strong> ₹${report.netProfit}</li>
    <li><strong>New Admissions:</strong> ${report.newAdmissions}</li>
    <li><strong>Vacated Students:</strong> ${report.vacatedStudents}</li>
    <li><strong>Pending Payments:</strong> ₹${report.pendingPayments}</li>
    <li><strong>Occupancy Rate:</strong> ${report.occupancyRate}%</li>
    <li><strong>Overall Performance:</strong> ${report.performanceStatus}</li>
  </ul>
</div>
`;
