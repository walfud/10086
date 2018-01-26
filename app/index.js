import React, {
    Component,
} from 'react'
import ReactDOM from 'react-dom'
import {
    Input,
} from 'material-ui'

class App extends Component {
    render() {
        return (
            <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
            }}>
                <Like />
            </div>
        )
    }
}

class Like extends Component {
    constructor(props) {
        super(props)
        this.state = {
            num: '1..........',
        }
    }

    render() {
        const child = this.state.num.split('').map((n) => <Input
            style={{
                display: 'flex',
                flex: 1,
                minWidth: 10,
                maxWidth: 60,
                type: 'number',
                borderWidth: 1,
                borderColor: '#666',
                disableUnderline: true,
            }}
            value={n}
            onChange={this.onChange}
        />)

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
            }}>
                {child}
            </div>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root'),
)