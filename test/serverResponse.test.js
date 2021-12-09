import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../index';

chai.use(chaiHttp);
const { expect } = chai;

/**
 * @description Test server response for the 'test' route
 */
describe('Server', () => {
  it('Should return a response with a message', done => {
    chai.request(app)
    .get('/test')
    .end((err, res) => {
      expect(res.body).to.have.property('message').eql('Server is Up and Running');
      expect(res.status).to.equal(200);
      done();
    })
  })
})