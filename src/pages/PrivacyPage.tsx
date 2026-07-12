export function PrivacyPage() {
  return (
    <div className="page legal-page">
      <header className="page__header">
        <h1>Política de Privacidade</h1>
        <p className="page__meta">Última atualização: julho de 2026</p>
      </header>

      <section>
        <h2>Quais dados coletamos</h2>
        <p>
          O Compare Ofertas não exige cadastro nem login. Coletamos dados pessoais apenas quando
          você se cadastra voluntariamente na nossa newsletter, através do seu e-mail. Também
          guardamos localmente no seu navegador (localStorage), sem enviar pra nós, os produtos que
          você seleciona no comparador — esse dado não sai do seu dispositivo.
        </p>
      </section>

      <section>
        <h2>Como usamos seu e-mail</h2>
        <p>
          Se você se cadastrar na newsletter, usamos seu e-mail para enviar cupons e ofertas
          semanais, e eventualmente lembretes sobre produtos que você visitou no site. O
          processamento é feito pela Resend, nossa plataforma de envio de e-mails, que atua como
          operadora dos dados nos termos da LGPD (Lei 13.709/2018).
        </p>
      </section>

      <section>
        <h2>Base legal e consentimento</h2>
        <p>
          Tratamos seu e-mail com base no seu consentimento explícito, dado no momento do
          cadastro. Você pode retirar esse consentimento a qualquer momento, clicando no link de
          descadastro presente em todo e-mail que enviamos, ou solicitando a exclusão pelo contato
          abaixo.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <p>De acordo com a LGPD, você tem direito a:</p>
        <ul>
          <li>Confirmar se tratamos seus dados e acessá-los;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>Solicitar a exclusão dos seus dados;</li>
          <li>Revogar o consentimento a qualquer momento;</li>
          <li>Solicitar a portabilidade dos seus dados a outro fornecedor.</li>
        </ul>
      </section>

      <section>
        <h2>Cookies e links de afiliado</h2>
        <p>
          Ao clicar num produto e ir até a loja parceira, você sai do nosso site — a loja e a rede
          de afiliados (Awin) podem definir seus próprios cookies de rastreamento de venda,
          conforme as políticas de privacidade delas, fora do nosso controle.
        </p>
      </section>

      <section>
        <h2>Contato</h2>
        <p>
          Para dúvidas sobre seus dados ou para solicitar a exclusão do seu cadastro, entre em
          contato pelo e-mail{' '}
          <a href="mailto:atendimento@blendibox.com.br">atendimento@blendibox.com.br</a>.
        </p>
      </section>

      <p className="legal-disclaimer">
        Este texto é um modelo geral e não substitui uma revisão jurídica específica para o seu
        negócio.
      </p>
    </div>
  )
}
