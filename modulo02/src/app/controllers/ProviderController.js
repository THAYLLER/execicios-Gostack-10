import Users from '../models/Users';
import File from '../models/File';

class ProviderController {
  async index(req, res) {
    const providers = await Users.findAll({
      where: { provider: true},
      attributes: ['id', 'name', 'email', 'avatar_id'],
      include: [File],
    });

    return res.json(providers);
  }

}


export default new ProviderController();
