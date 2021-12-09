const userController = require('./userController');

export default socket => {
  // notify ipad admin when ipad connects (socket reconnects)
  socket.on('reconnect', async () => {
    const req = {};
    const user = { company: socket.company };
    req.user = user;
    const company = await userController.getCompany(req, undefined);
    await userController.NotifyIpadAdmin(
      socket.company,
      `${company.name} visitor sign in ipad has come on`,
      socket.location
    );
  });


  // notify ipad admin when ipad disconnects (socket disconnects)
  socket.on('disconnect', async () => {
    const req = {};
    const user = { company: socket.company };
    req.user = user;
    const company = await userController.getCompany(req, undefined);
    await userController.NotifyIpadAdmin(
      socket.company,
      `${company.name} visitor sign in ipad has gone off`,
      socket.location
    );
  });


  // register company id and location when socket connects
  socket.on('register_company', (company, location) => {
    console.log(company, location)
    if (company) socket.company = company;
    if (location) socket.location = location;
  });
};
